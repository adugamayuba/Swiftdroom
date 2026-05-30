let state = {
  profile: null,
  personas: [],
  fieldMappings: [],
  fields: [],
  pageContext: null,
  selectedPersonaId: null,
  usage: null,
  apiUrl: "http://localhost:3000",
};

async function init() {
  const config = await SwiftdroomAPI.getConfig();
  state.apiUrl = config.apiUrl;
  updateDashboardLinks(config.apiUrl);

  if (!config.apiToken) {
    showScreen("setup");
    bindSetup();
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
    showScreen("setup");
    bindSetup();
  }
}

function updateDashboardLinks(apiUrl) {
  const settingsLink = document.getElementById("dashboard-link");
  const subscribeLink = document.getElementById("subscribe-link");
  if (settingsLink) settingsLink.href = `${apiUrl}/dashboard/settings`;
  if (subscribeLink) subscribeLink.href = `${apiUrl}/subscribe`;
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
  document.getElementById("setup-screen").classList.toggle("hidden", name !== "setup");
  document.getElementById("subscription-screen").classList.toggle("hidden", name !== "subscription");
  document.getElementById("main-screen").classList.toggle("hidden", name !== "main");
}

function bindSetup() {
  document.getElementById("connect-btn").addEventListener("click", async () => {
    const token = document.getElementById("api-token-input").value.trim();
    const url = document.getElementById("api-url-input").value.trim();
    const errorEl = document.getElementById("setup-error");

    if (!token) {
      errorEl.textContent = "API token is required";
      errorEl.classList.remove("hidden");
      return;
    }

    await SwiftdroomAPI.setConfig(token, url);

    try {
      await loadSyncData();
      errorEl.classList.add("hidden");
      showScreen("main");
      bindMain();
    } catch (err) {
      errorEl.textContent = err.message || "Connection failed";
      errorEl.classList.remove("hidden");
    }
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

async function sendToContent(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: ["lib/form-detector.js", "content.js"],
    });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

async function scanFields() {
  const tab = await getActiveTab();
  if (!tab?.id) return;

  const [fieldsRes, contextRes] = await Promise.all([
    sendToContent(tab.id, { type: "SCAN_FIELDS" }),
    sendToContent(tab.id, { type: "GET_PAGE_CONTEXT" }),
  ]);

  state.fields = fieldsRes?.fields || [];
  state.pageContext = contextRes || {};
  renderFields();
  return state.fields;
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
      await sendToContent(tab.id, {
        type: "FILL_FIELD",
        fieldId: field.id,
        value,
      });
      field._status = "filled";
      field._value = value;
      filled++;
    } else if (field.label) {
      field._status = "uncertain";
      uncertain++;
      await sendToContent(tab.id, {
        type: "HIGHLIGHT_FIELD",
        fieldId: field.id,
        color: "#f59e0b",
      });
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
    return;
  }

  section.classList.remove("hidden");
  const domain = state.pageContext?.meta ? "" : "";

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
      if (value && tab?.id) {
        await sendToContent(tab.id, { type: "FILL_FIELD", fieldId, value });
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
          await sendToContent(tabId, {
            type: "FILL_FIELD",
            fieldId,
            value: data.answer,
          });
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

init();
