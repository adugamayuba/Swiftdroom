const DEFAULT_APP_URL = "https://swiftdroom.com";

let state = {
  profile: null,
  personas: [],
  fieldMappings: [],
  fields: [],
  pageContext: null,
  selectedPersonaId: null,
  usage: null,
  apiUrl: DEFAULT_APP_URL,
};

const listenersBound = { connect: false, main: false };

async function init() {
  const config = await SwiftdroomAPI.getConfig();
  state.apiUrl = config.apiUrl || DEFAULT_APP_URL;
  updateDashboardLinks(state.apiUrl);

  if (!config.apiToken) {
    showConnectScreen();
    return;
  }

  try {
    await loadSyncData();
    showScreen("main");
    bindMain();
  } catch (err) {
    if (err.code === "SUBSCRIPTION_REQUIRED") {
      showSubscriptionScreen(err);
      return;
    }
    showConnectScreen(
      "Your session may have expired. Sign in again on swiftdroom.com, open Settings, then refresh below."
    );
  }
}

function updateDashboardLinks(apiUrl) {
  const base = apiUrl || DEFAULT_APP_URL;
  const loginLink = document.getElementById("login-link");
  const settingsLink = document.getElementById("settings-link");
  const subscribeLink = document.getElementById("subscribe-link");
  if (loginLink) loginLink.href = `${base}/login`;
  if (settingsLink) settingsLink.href = `${base}/dashboard/settings`;
  if (subscribeLink) subscribeLink.href = `${base}/subscribe`;
}

function showConnectScreen(message) {
  showScreen("connect");
  const msgEl = document.getElementById("connect-message");
  if (msgEl && message) {
    msgEl.textContent = message;
  }
  const errorEl = document.getElementById("connect-error");
  if (errorEl) errorEl.classList.add("hidden");
  bindConnect();
}

function showSubscriptionScreen(err) {
  showScreen("subscription");
  const msg = document.getElementById("subscription-message");
  if (msg) {
    msg.textContent = err.onboardingComplete
      ? "Subscribe to a plan to unlock the extension."
      : "Complete your profile setup, then subscribe to use the extension.";
  }
}

function showScreen(name) {
  document.getElementById("connect-screen").classList.toggle("hidden", name !== "connect");
  document.getElementById("subscription-screen").classList.toggle("hidden", name !== "subscription");
  document.getElementById("main-screen").classList.toggle("hidden", name !== "main");
}

function bindConnect() {
  if (listenersBound.connect) return;
  listenersBound.connect = true;

  document.getElementById("retry-connect-btn").addEventListener("click", async () => {
    const errorEl = document.getElementById("connect-error");
    const config = await SwiftdroomAPI.getConfig();

    if (!config.apiToken) {
      errorEl.textContent =
        "Not connected yet. Sign in at swiftdroom.com and open Settings once, then try again.";
      errorEl.classList.remove("hidden");
      return;
    }

    errorEl.classList.add("hidden");
    await init();
  });
}

async function loadSyncData() {
  const data = await SwiftdroomAPI.sync();
  state.profile = data.profile;
  state.personas = data.personas || [];
  state.fieldMappings = data.fieldMappings || [];
  state.usage = data.usage || null;

  const badge = document.getElementById("usage-badge");
  if (badge && state.usage) {
    badge.textContent = `${state.usage.remaining} left`;
  }

  const select = document.getElementById("persona-select");
  select.innerHTML = state.personas
    .map(
      (p) =>
        `<option value="${p.id}" ${p.isDefault ? "selected" : ""}>${p.name}${p.focus ? ` — ${p.focus}` : ""}</option>`
    )
    .join("");

  state.selectedPersonaId = select.value;
}

function bindMain() {
  if (listenersBound.main) return;
  listenersBound.main = true;

  document.getElementById("persona-select").addEventListener("change", (e) => {
    state.selectedPersonaId = e.target.value;
  });

  document.getElementById("scan-btn").addEventListener("click", scanAndAutofill);
  document.getElementById("rescan-btn").addEventListener("click", scanFields);
  document.getElementById("log-application-btn").addEventListener("click", logApplication);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isInjectableUrl(url) {
  return Boolean(url && (url.startsWith("http://") || url.startsWith("https://")));
}

async function injectDetectorAllFrames(tabId) {
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ["lib/form-detector.js"],
  });
}

async function scanFields() {
  const tab = await getActiveTab();
  if (!tab?.id || !isInjectableUrl(tab.url)) {
    state.fields = [];
    renderFields();
    return [];
  }

  try {
    await injectDetectorAllFrames(tab.id);

    const [fieldResults, contextResults] = await Promise.all([
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () =>
          window.SwiftdroomFormDetector ? window.SwiftdroomFormDetector.detectFields() : [],
      }),
      chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () =>
          window.SwiftdroomFormDetector
            ? {
                jobDescription: window.SwiftdroomFormDetector.scrapeJobDescription(),
                meta: window.SwiftdroomFormDetector.scrapePageMeta(),
              }
            : { jobDescription: "", meta: {} },
      }),
    ]);

    const merged = [];
    for (const { result, frameId } of fieldResults) {
      if (!Array.isArray(result)) continue;
      for (const field of result) {
        merged.push({ ...field, frameId });
      }
    }

    state.fields = merged;
    const contexts = contextResults.map((r) => r.result).filter(Boolean);
    state.pageContext = contexts.sort(
      (a, b) => (b.jobDescription?.length || 0) - (a.jobDescription?.length || 0)
    )[0] || {};
  } catch (err) {
    console.error("Swiftdroom scan failed:", err);
    state.fields = [];
    state.pageContext = {};
  }

  renderFields();
  return state.fields;
}

async function runInFrame(tabId, frameId, func, args = []) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    func,
    args,
  });
  return result?.result;
}

async function fillFieldInFrame(tabId, field) {
  await runInFrame(
    tabId,
    field.frameId ?? 0,
    (fieldId, value) => {
      const el = document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
      if (!el || !window.SwiftdroomFormDetector) return false;
      window.SwiftdroomFormDetector.setElementValue(el, value);
      return true;
    },
    [field.id, field.value]
  );
}

async function highlightFieldInFrame(tabId, field, color) {
  await runInFrame(
    tabId,
    field.frameId ?? 0,
    (fieldId, highlightColor) => {
      if (!window.SwiftdroomFormDetector) return false;
      window.SwiftdroomFormDetector.clearHighlights();
      window.SwiftdroomFormDetector.highlightField(fieldId, highlightColor);
      return true;
    },
    [field.id, color]
  );
}

async function scanAndAutofill() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  await scanFields();
  const domain = new URL(tab.url).hostname;

  let filled = 0;
  let uncertain = 0;

  for (const field of state.fields) {
    if (SwiftdroomFieldMapper.isOpenEndedField(field)) continue;

    const value = SwiftdroomFieldMapper.resolveWithMappings(
      field.label,
      state.profile,
      state.fieldMappings,
      domain
    );

    if (value) {
      field.value = value;
      await fillFieldInFrame(tab.id, field);
      field._status = "filled";
      field._value = value;
      filled++;
    } else if (field.label) {
      field._status = "uncertain";
      uncertain++;
      await highlightFieldInFrame(tab.id, field, "#f59e0b");
    }
  }

  document.getElementById("stats").classList.remove("hidden");
  document.getElementById("filled-count").textContent = `${filled} filled`;
  document.getElementById("uncertain-count").textContent = `${uncertain} need mapping`;

  renderFields();
  renderGhostwriter(tab.id);
}

function renderFields() {
  const section = document.getElementById("fields-section");
  const list = document.getElementById("fields-list");

  if (state.fields.length === 0) {
    section.classList.add("hidden");
    const hint = document.getElementById("scan-hint");
    if (hint) hint.classList.remove("hidden");
    return;
  }

  const hint = document.getElementById("scan-hint");
  if (hint) hint.classList.add("hidden");

  section.classList.remove("hidden");

  list.innerHTML = state.fields
    .filter((f) => !SwiftdroomFieldMapper.isOpenEndedField(f))
    .map((field) => {
      const statusClass =
        field._status === "filled"
          ? "filled"
          : field._status === "uncertain"
            ? "uncertain"
            : "";

      const mappingSelect =
        field._status === "uncertain"
          ? `<div class="field-mapping">
              <select data-field-id="${field.id}" data-label="${escapeHtml(field.label)}" class="mapping-select">
                <option value="">Map to profile field...</option>
                ${SwiftdroomFieldMapper.FIELD_KEYS.map(
                  (k) => `<option value="${k}">${k}</option>`
                ).join("")}
              </select>
            </div>`
          : "";

      return `<div class="field-item ${statusClass}">
        <div class="field-label-text">${escapeHtml(field.label || "Unknown field")}</div>
        <div class="field-status">${
          field._status === "filled"
            ? `✓ ${escapeHtml(field._value?.slice(0, 40) || "")}${field._value?.length > 40 ? "..." : ""}`
            : field._status === "uncertain"
              ? "⚠ Needs manual mapping"
              : "Not scanned"
        }</div>
        ${mappingSelect}
      </div>`;
    })
    .join("");

  list.querySelectorAll(".mapping-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const fieldId = e.target.dataset.fieldId;
      const label = e.target.dataset.label;
      const fieldKey = e.target.value;
      if (!fieldKey) return;

      const tab = await getActiveTab();
      const hostname = new URL(tab.url).hostname;

      await SwiftdroomAPI.saveFieldMapping({
        domain: hostname,
        labelPattern: label.toLowerCase(),
        fieldKey,
      });

      state.fieldMappings.push({
        domain: hostname,
        labelPattern: label.toLowerCase(),
        fieldKey,
      });

      const value = SwiftdroomFieldMapper.resolveFieldValue(state.profile, fieldKey);
      const target = state.fields.find((f) => f.id === fieldId);
      if (value && tab?.id && target) {
        target.value = value;
        await fillFieldInFrame(tab.id, target);
      }

      await scanAndAutofill();
    });
  });
}

async function renderGhostwriter(tabId) {
  const section = document.getElementById("ghostwriter-section");
  const list = document.getElementById("ghostwriter-list");

  const openFields = state.fields.filter(SwiftdroomFieldMapper.isOpenEndedField);

  if (openFields.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  list.innerHTML = openFields
    .map(
      (field) => `
    <div class="ghostwriter-item" data-field-id="${field.id}">
      <div class="ghostwriter-question">${escapeHtml(field.label || "Open-ended question")}</div>
      <div class="ghostwriter-answer ghostwriter-loading">Click Generate to write an answer...</div>
      <button class="btn btn-sm btn-generate" data-field-id="${field.id}" data-question="${escapeHtml(field.label)}">Generate</button>
    </div>`
    )
    .join("");

  list.querySelectorAll(".btn-generate").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const fieldId = btn.dataset.fieldId;
      const question = btn.dataset.question;
      const item = btn.closest(".ghostwriter-item");
      const answerEl = item.querySelector(".ghostwriter-answer");

      answerEl.textContent = "Generating...";
      answerEl.classList.add("ghostwriter-loading");
      btn.disabled = true;

      try {
        const data = await SwiftdroomAPI.generate({
          question,
          jobDescription: state.pageContext?.jobDescription || "",
          personaId: state.selectedPersonaId,
          company: state.pageContext?.meta?.company || "",
        });

        if (state.usage) {
          state.usage.used += 1;
          state.usage.remaining = Math.max(0, state.usage.remaining - 1);
          const badge = document.getElementById("usage-badge");
          if (badge) badge.textContent = `${state.usage.remaining} left`;
        }

        answerEl.textContent = data.answer;
        answerEl.classList.remove("ghostwriter-loading");

        const insertBtn = document.createElement("button");
        insertBtn.className = "btn btn-sm btn-insert btn-block";
        insertBtn.textContent = "Click to Insert";
        insertBtn.addEventListener("click", async () => {
          const target = state.fields.find((f) => f.id === fieldId);
          if (target) {
            target.value = data.answer;
            await fillFieldInFrame(tabId, target);
          }
          insertBtn.textContent = "✓ Inserted";
          insertBtn.disabled = true;
        });

        item.appendChild(insertBtn);
      } catch (err) {
        if (err.code === "QUOTA_EXCEEDED") {
          answerEl.textContent = "Monthly application limit reached. Upgrade your plan in the dashboard.";
        } else {
          answerEl.textContent = `Error: ${err.message}`;
        }
      }

      btn.disabled = false;
    });
  });
}

async function logApplication() {
  const tab = await getActiveTab();
  if (!tab?.url) return;

  const meta = state.pageContext?.meta || {};
  const btn = document.getElementById("log-application-btn");
  btn.textContent = "Logging...";
  btn.disabled = true;

  try {
    await SwiftdroomAPI.logApplication({
      company: meta.company || "Unknown company",
      role: meta.role || meta.title || "Unknown role",
      url: tab.url,
      personaId: state.selectedPersonaId,
    });
    btn.textContent = "✓ Application logged";
  } catch (err) {
    btn.textContent = `Error: ${err.message}`;
  }

  setTimeout(() => {
    btn.textContent = "Log this application";
    btn.disabled = false;
  }, 3000);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.apiToken || changes.apiUrl)) {
    init();
  }
});

init();
