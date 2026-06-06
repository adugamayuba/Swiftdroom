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
  currentPageUrl: null,
  recordedApplicationUrl: null,
};

const listenersBound = { connect: false, main: false };

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function getSelectedPersona() {
  return SwiftdroomFieldMapper.getPersona(
    { personas: state.personas },
    state.selectedPersonaId
  );
}

function getDomainFromTab(tab) {
  try {
    return new URL(tab.url).hostname;
  } catch {
    return "";
  }
}

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
  if (msgEl && message) msgEl.textContent = message;
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

  document.getElementById("persona-select").addEventListener("change", async (e) => {
    state.selectedPersonaId = e.target.value;
    if (state.fields.length) {
      applySuggestionsToFields(getDomainFromTab(await getActiveTab()));
      renderFields();
      renderGhostwriter((await getActiveTab())?.id);
    }
  });

  document.getElementById("scan-btn").addEventListener("click", scanForm);
  document.getElementById("rescan-btn").addEventListener("click", scanForm);
  document.getElementById("fill-form-btn").addEventListener("click", fillApplicationMagic);
  document.getElementById("generate-all-btn").addEventListener("click", generateAllGhostwriter);
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

  return state.fields;
}

function matchDraftToSelectOption(draft, options) {
  if (!draft || !options?.length) return draft || "";
  const target = draft.toLowerCase().trim();
  let best = null;
  let bestScore = 0;

  for (const opt of options) {
    const text = (opt.text || "").toLowerCase();
    const val = (opt.value || "").toLowerCase();
    let score = 0;
    if (text === target || val === target) score = 100;
    else if (text.startsWith(target) || target.startsWith(text)) score = 80;
    else if (text.includes(target) || target.includes(text)) score = 60;
    if (score > bestScore) {
      bestScore = score;
      best = opt;
    }
  }

  return bestScore >= 40 ? best.value : draft;
}

function isDropdownField(field) {
  return Boolean(field.isSelect || field.isCombobox || field.tag === "select");
}

function applySuggestionsToFields(domain) {
  const persona = getSelectedPersona();

  for (const field of state.fields) {
    if (SwiftdroomFieldMapper.isOpenEndedField(field)) {
      if (field._draftValue == null) field._draftValue = "";
      field._status = "essay";
      continue;
    }

    const { value, source } = SwiftdroomFieldMapper.suggestValue(
      field.label,
      state.profile,
      persona,
      state.fieldMappings,
      domain
    );

    let draft = value || field.value || "";
    if (isDropdownField(field) && field.options?.length) {
      draft = matchDraftToSelectOption(draft, field.options);
    }

    field._draftValue = draft;
    field._source = source;
    field._status = field._draftValue ? (source === "empty" ? "empty" : "suggested") : "empty";
  }
}

async function recordApplicationAfterFill(filledCount, attemptedCount) {
  if (filledCount < 1) return false;

  const tab = await getActiveTab();
  if (!tab?.url || !isInjectableUrl(tab.url)) return false;
  if (state.recordedApplicationUrl === tab.url) return true;

  const meta = state.pageContext?.meta || {};
  const statusEl = document.getElementById("uncertain-count");

  try {
    if (statusEl) statusEl.textContent = "Saving application…";

    await SwiftdroomAPI.logApplication({
      company: meta.company || "Unknown company",
      role: meta.role || meta.title || "Unknown role",
      url: tab.url,
      personaId: state.selectedPersonaId,
      status: "filled",
      notes: `Autofilled ${filledCount} of ${attemptedCount} fields via extension`,
    });

    state.recordedApplicationUrl = tab.url;

    if (state.usage) {
      state.usage.used += 1;
      state.usage.remaining = Math.max(0, state.usage.remaining - 1);
      const badge = document.getElementById("usage-badge");
      if (badge) badge.textContent = `${state.usage.remaining} left`;
    }

    updateStats();
    return true;
  } catch (err) {
    if (err.code === "QUOTA_EXCEEDED" && statusEl) {
      statusEl.textContent = "Monthly limit reached";
    } else if (statusEl) {
      statusEl.textContent = "Could not save application";
    }
    return false;
  }
}

function updateStats() {
  const stats = document.getElementById("stats");
  if (!stats) return;

  const shortFields = state.fields.filter((f) => !SwiftdroomFieldMapper.isOpenEndedField(f));
  const essays = state.fields.filter((f) => SwiftdroomFieldMapper.isOpenEndedField(f));
  const ready = [...shortFields, ...essays].filter((f) => (f._draftValue || "").trim()).length;
  const total = shortFields.length + essays.length;
  const needs = total - ready;

  stats.classList.remove("hidden");
  document.getElementById("filled-count").textContent = `${ready} ready`;

  const statusEl = document.getElementById("uncertain-count");
  if (state.recordedApplicationUrl && state.recordedApplicationUrl === state.currentPageUrl) {
    statusEl.textContent = "✓ Application counted";
    statusEl.style.color = "#059669";
  } else if (needs > 0) {
    statusEl.textContent = `${needs} to review`;
    statusEl.style.color = "";
  } else {
    statusEl.textContent = "Ready to fill";
    statusEl.style.color = "";
  }
}

async function scanForm() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  const scanBtn = document.getElementById("scan-btn");
  scanBtn.disabled = true;
  scanBtn.textContent = "Scanning…";

  if (state.currentPageUrl !== tab.url) {
    state.recordedApplicationUrl = null;
  }
  state.currentPageUrl = tab.url;

  await scanFields();
  applySuggestionsToFields(getDomainFromTab(tab));
  updateStats();
  renderFields();
  renderGhostwriter(tab.id);

  scanBtn.disabled = false;
  scanBtn.textContent = "Scan form";
}

async function runInFrame(tabId, frameId, func, args = []) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId, frameIds: [frameId] },
    func,
    args,
  });
  return result?.result;
}

async function scrollToFieldInFrame(tabId, field) {
  await runInFrame(
    tabId,
    field.frameId ?? 0,
    (fieldId) => {
      if (!window.SwiftdroomFormDetector) return false;
      return window.SwiftdroomFormDetector.scrollToField(fieldId);
    },
    [field.id]
  );
}

async function setFieldValueInFrame(tabId, field, value) {
  await runInFrame(
    tabId,
    field.frameId ?? 0,
    (fieldId, val) => {
      const el = document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
      if (!el || !window.SwiftdroomFormDetector) return false;
      window.SwiftdroomFormDetector.setElementValue(el, val);
      return true;
    },
    [field.id, value]
  );
}

async function fillDropdownField(tabId, field, value) {
  const text = (value || "").trim();
  if (!text) return false;

  await scrollToFieldInFrame(tabId, field);
  await sleep(200);

  const ok = await runInFrame(
    tabId,
    field.frameId ?? 0,
    (fieldId, val) => {
      const el = document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
      if (!el || !window.SwiftdroomFormDetector) return false;
      return window.SwiftdroomFormDetector.setElementValue(el, val);
    },
    [field.id, text]
  );

  if (ok) {
    await runInFrame(
      tabId,
      field.frameId ?? 0,
      (fieldId) => {
        const el = document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
        if (el && window.SwiftdroomFormDetector) {
          window.SwiftdroomFormDetector.highlightField(fieldId, "#8b5cf6");
        }
      },
      [field.id]
    );
    await sleep(200);
  }

  return Boolean(ok);
}

async function typeFieldMagically(tabId, field, text) {
  const value = text || "";
  if (!value.trim()) return false;

  if (isDropdownField(field)) {
    return fillDropdownField(tabId, field, value);
  }

  await scrollToFieldInFrame(tabId, field);
  await sleep(280);

  await runInFrame(
    tabId,
    field.frameId ?? 0,
    (fieldId) => {
      const el = document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
      if (el && window.SwiftdroomFormDetector) {
        window.SwiftdroomFormDetector.setElementValue(el, "");
      }
    },
    [field.id]
  );

  let built = "";
  const chunk = field.isLongForm ? 4 : 1;

  for (let i = 0; i < value.length; i += chunk) {
    built = value.slice(0, Math.min(i + chunk, value.length));
    await setFieldValueInFrame(tabId, field, built);
    const delay = field.isLongForm ? 18 : 28 + Math.random() * 22;
    await sleep(delay);
  }

  await runInFrame(
    tabId,
    field.frameId ?? 0,
    (fieldId) => {
      const el = document.querySelector(`[data-swiftdroom-id="${fieldId}"]`);
      if (el && window.SwiftdroomFormDetector) {
        window.SwiftdroomFormDetector.highlightField(fieldId, "#8b5cf6");
      }
    },
    [field.id]
  );
  await sleep(200);
  return true;
}

function sourceLabel(source) {
  if (source === "profile") return "From your profile";
  if (source === "resume") return "Suggested from resume";
  return "Add your answer";
}

function renderFields() {
  const section = document.getElementById("fields-section");
  const list = document.getElementById("fields-list");

  if (state.fields.length === 0) {
    section.classList.add("hidden");
    document.getElementById("scan-hint")?.classList.remove("hidden");
    return;
  }

  document.getElementById("scan-hint")?.classList.add("hidden");
  section.classList.remove("hidden");

  const shortFields = state.fields.filter((f) => !SwiftdroomFieldMapper.isOpenEndedField(f));

  list.innerHTML = shortFields
    .map((field) => {
      const draft = field._draftValue ?? "";
      const statusClass =
        draft.trim() ? (field._source === "resume" ? "guessed" : "filled") : "uncertain";
      const dropdown = isDropdownField(field) && field.options?.length;

      const control = dropdown
        ? `<select class="field-draft-select" data-field-id="${field.id}">
            <option value="">Select…</option>
            ${field.options
              .map((opt) => {
                const selected =
                  draft === opt.value || draft === opt.text ? " selected" : "";
                return `<option value="${escapeAttr(opt.value)}"${selected}>${escapeHtml(opt.text)}</option>`;
              })
              .join("")}
          </select>`
        : `<textarea class="field-draft" rows="${draft.length > 80 ? 3 : 2}" data-field-id="${field.id}" placeholder="Type or edit answer…">${escapeHtml(draft)}</textarea>`;

      return `<div class="field-item ${statusClass}" data-field-id="${field.id}">
        <div class="field-label-text">${escapeHtml(field.label || "Field")}${dropdown ? ' <span class="field-type-tag">Dropdown</span>' : ""}</div>
        <div class="field-source">${sourceLabel(field._source)}</div>
        ${control}
      </div>`;
    })
    .join("");

  function handleDraftChange(fieldId, value) {
    const field = state.fields.find((f) => f.id === fieldId);
    if (!field) return;
    field._draftValue = value;
    field._status = field._draftValue.trim() ? "edited" : "empty";
    field._source = "edited";
    updateStats();
    const card = list.querySelector(`.field-item[data-field-id="${fieldId}"]`);
    if (card) {
      card.classList.toggle("filled", Boolean(field._draftValue.trim()));
      card.classList.toggle("uncertain", !field._draftValue.trim());
      card.classList.toggle("guessed", field._source === "resume");
    }
  }

  list.querySelectorAll(".field-draft").forEach((el) => {
    el.addEventListener("input", (e) => {
      handleDraftChange(e.target.dataset.fieldId, e.target.value);
    });
  });

  list.querySelectorAll(".field-draft-select").forEach((el) => {
    el.addEventListener("change", (e) => {
      handleDraftChange(e.target.dataset.fieldId, e.target.value);
    });
  });
}

function renderGhostwriter(tabId) {
  const section = document.getElementById("ghostwriter-section");
  const list = document.getElementById("ghostwriter-list");
  const generateAllBtn = document.getElementById("generate-all-btn");

  const openFields = state.fields.filter(SwiftdroomFieldMapper.isOpenEndedField);

  if (openFields.length === 0) {
    section.classList.add("hidden");
    return;
  }

  section.classList.remove("hidden");
  if (generateAllBtn) generateAllBtn.classList.remove("hidden");

  list.innerHTML = openFields
    .map(
      (field) => `
    <div class="ghostwriter-item" data-field-id="${field.id}">
      <div class="ghostwriter-question">${escapeHtml(field.label || "Question")}</div>
      <textarea class="ghostwriter-draft" rows="4" data-field-id="${field.id}" placeholder="Write your answer or generate below…">${escapeHtml(field._draftValue || "")}</textarea>
      <button type="button" class="btn btn-sm btn-generate" data-field-id="${field.id}">Generate</button>
    </div>`
    )
    .join("");

  list.querySelectorAll(".ghostwriter-draft").forEach((el) => {
    el.addEventListener("input", (e) => {
      const field = state.fields.find((f) => f.id === e.target.dataset.fieldId);
      if (field) {
        field._draftValue = e.target.value;
        updateStats();
      }
    });
  });

  list.querySelectorAll(".btn-generate").forEach((btn) => {
    btn.addEventListener("click", () => generateOneAnswer(btn.dataset.fieldId, tabId, btn));
  });
}

async function generateOneAnswer(fieldId, tabId, btn) {
  const field = state.fields.find((f) => f.id === fieldId);
  if (!field) return;

  const item = btn?.closest(".ghostwriter-item");
  const textarea = item?.querySelector(".ghostwriter-draft");

  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating…";
  }
  if (textarea) textarea.classList.add("ghostwriter-loading");

  try {
    const data = await SwiftdroomAPI.generate({
      question: field.label,
      jobDescription: state.pageContext?.jobDescription || "",
      personaId: state.selectedPersonaId,
      company: state.pageContext?.meta?.company || "",
    });

    field._draftValue = data.answer;
    if (textarea) {
      textarea.value = data.answer;
      textarea.classList.remove("ghostwriter-loading");
    }
    updateStats();
  } catch (err) {
    if (textarea) {
      textarea.value = SwiftdroomFriendlyErrors.message(
        err.message,
        err.code,
        "We couldn't generate an answer. Please try again."
      );
      textarea.classList.remove("ghostwriter-loading");
    }
  }

  if (btn) {
    btn.disabled = false;
    btn.textContent = "Generate";
  }
}

async function generateAllGhostwriter() {
  const tab = await getActiveTab();
  const openFields = state.fields.filter(SwiftdroomFieldMapper.isOpenEndedField);
  const btn = document.getElementById("generate-all-btn");

  if (!openFields.length) return;

  btn.disabled = true;
  btn.textContent = "Generating all…";

  for (let i = 0; i < openFields.length; i++) {
    const field = openFields[i];
    btn.textContent = `Generating ${i + 1}/${openFields.length}…`;
    const itemBtn = document.querySelector(
      `.ghostwriter-item[data-field-id="${field.id}"] .btn-generate`
    );
    await generateOneAnswer(field.id, tab?.id, itemBtn);
    await sleep(400);
  }

  btn.disabled = false;
  btn.textContent = "Generate all answers";
}

async function fillApplicationMagic() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  const btn = document.getElementById("fill-form-btn");
  const toFill = state.fields.filter((f) => (f._draftValue || "").trim());

  if (!toFill.length) {
    btn.textContent = "Add answers first";
    setTimeout(() => {
      btn.textContent = "Fill application ✨";
    }, 2000);
    return;
  }

  btn.disabled = true;

  const ordered = [
    ...toFill.filter((f) => !SwiftdroomFieldMapper.isOpenEndedField(f) && !f.isLongForm),
    ...toFill.filter((f) => !SwiftdroomFieldMapper.isOpenEndedField(f) && f.isLongForm),
    ...toFill.filter((f) => SwiftdroomFieldMapper.isOpenEndedField(f)),
  ];

  try {
    await injectDetectorAllFrames(tab.id);

    let filledCount = 0;
    for (let i = 0; i < ordered.length; i++) {
      const field = ordered[i];
      btn.textContent = `Filling ${i + 1}/${ordered.length}…`;
      const ok = await typeFieldMagically(tab.id, field, field._draftValue.trim());
      if (ok) filledCount += 1;
      await sleep(isDropdownField(field) ? 500 : 350);
    }

    const saved = await recordApplicationAfterFill(filledCount, ordered.length);
    btn.textContent = saved
      ? "✨ Done — application counted"
      : "✨ Done — review & submit";
  } catch (err) {
    btn.textContent = SwiftdroomFriendlyErrors.message(
      err.message,
      err.code,
      "Something went wrong. Please try again."
    );
  }

  setTimeout(() => {
    btn.textContent = "Fill application ✨";
    btn.disabled = false;
  }, 4000);
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.apiToken || changes.apiUrl)) {
    init();
  }
});

init();
