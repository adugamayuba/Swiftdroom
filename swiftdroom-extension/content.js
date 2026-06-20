const JOB_HOST_PATTERNS = [
  "myworkdayjobs.com",
  "workday.com",
  "greenhouse.io",
  "lever.co",
  "ashbyhq.com",
  "smartrecruiters.com",
  "icims.com",
  "taleo.net",
  "jobvite.com",
  "bamboohr.com",
  "recruitee.com",
  "teamtailor.com",
  "linkedin.com",
  "indeed.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "careerbuilder.com",
  "simplyhired.com",
  "dice.com",
  "wellfound.com",
  "angel.co",
  "jobs.lever.co",
  "boards.greenhouse.io",
  "applytojob.com",
  "ultipro.com",
  "successfactors.com",
  "oraclecloud.com",
  "paylocity.com",
  "paycom.com",
];

const JOB_PATH_PATTERNS = [
  /\/apply\b/i,
  /\/application/i,
  /\/careers?\b/i,
  /\/jobs?\b/i,
  /\/job\//i,
  /\/posting/i,
  /\/requisition/i,
  /\/opportunit/i,
  /\/vacanc/i,
  /\/hiring/i,
  /\/candidate/i,
  /\/employment/i,
];

const IGNORED_HOST_PATTERNS = [
  "google.",
  "youtube.",
  "facebook.",
  "twitter.",
  "x.com",
  "instagram.",
  "reddit.",
  "amazon.",
  "netflix.",
  "github.",
  "stackoverflow.",
  "swiftdroom.com",
  "localhost",
];

const detector = window.SwiftdroomFormDetector;

function isIgnoredHost() {
  const host = location.hostname.toLowerCase();
  return IGNORED_HOST_PATTERNS.some((p) => host.includes(p));
}

function looksLikeJobSiteUrl() {
  const host = location.hostname.toLowerCase();
  const path = `${location.pathname}${location.search}`.toLowerCase();

  if (JOB_HOST_PATTERNS.some((p) => host.includes(p))) return true;
  if (JOB_PATH_PATTERNS.some((p) => p.test(path))) return true;

  const title = (document.title || "").toLowerCase();
  if (/apply|application|career|job posting|job application|open role|we're hiring/.test(title)) {
    return true;
  }

  const h1 = document.querySelector("h1");
  if (h1 && /apply|job|career|opening|position|role at/.test((h1.textContent || "").toLowerCase())) {
    return true;
  }

  return false;
}

function hasApplicationForm() {
  if (!detector) return false;
  try {
    const fields = detector.detectFields();
    return fields.length >= 2;
  } catch {
    return false;
  }
}

function shouldShowBadge() {
  if (isIgnoredHost()) return false;
  if (looksLikeJobSiteUrl()) return true;
  if (hasApplicationForm()) return true;
  return false;
}

function injectAtsBadge() {
  if (!shouldShowBadge() || document.getElementById("swiftdroom-ats-badge")) return;

  const badge = document.createElement("button");
  badge.id = "swiftdroom-ats-badge";
  badge.type = "button";
  badge.textContent = "Swiftdroom — open sidebar to autofill";
  badge.setAttribute(
    "style",
    [
      "position:fixed",
      "bottom:20px",
      "right:20px",
      "z-index:2147483646",
      "background:#0f766e",
      "color:#fff",
      "border:none",
      "border-radius:999px",
      "padding:10px 16px",
      "font:600 13px/1.2 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif",
      "box-shadow:0 4px 20px rgba(0,0,0,.25)",
      "cursor:pointer",
    ].join(";")
  );

  badge.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
  });

  document.documentElement.appendChild(badge);
}

function removeAtsBadge() {
  document.getElementById("swiftdroom-ats-badge")?.remove();
}

function refreshAtsBadge() {
  if (shouldShowBadge()) {
    injectAtsBadge();
  } else {
    removeAtsBadge();
  }
}

let rescanTimer = null;
let badgeTimer = null;

function scheduleFormRescan() {
  clearTimeout(rescanTimer);
  rescanTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ type: "FORM_STEP_CHANGED" });
    refreshAtsBadge();
  }, 600);
}

function scheduleBadgeCheck() {
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(refreshAtsBadge, 800);
}

function watchFormSteps() {
  document.addEventListener(
    "click",
    (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const text = (target.textContent || "").toLowerCase().trim();
      if (
        /^(next|continue|save and continue|review|back|previous|submit application)$/.test(text) ||
        target.getAttribute("data-automation-id")?.includes("next") ||
        target.getAttribute("data-automation-id")?.includes("continue")
      ) {
        scheduleFormRescan();
      }
    },
    true
  );

  const observer = new MutationObserver(() => {
    scheduleFormRescan();
    scheduleBadgeCheck();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function initJobPageHelpers() {
  refreshAtsBadge();
  watchFormSteps();
  scheduleBadgeCheck();
  setTimeout(refreshAtsBadge, 1500);
  setTimeout(refreshAtsBadge, 4000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initJobPageHelpers);
} else {
  initJobPageHelpers();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCAN_FIELDS") {
    const fields = detector.detectFields();
    sendResponse({ fields });
    return true;
  }

  if (message.type === "RESOLVE_FIELD") {
    let el = detector.getElementByFieldId(message.fieldId);
    if (!el && message.label) {
      el = detector.findFieldByLabel(message.label);
    }
    if (el) {
      sendResponse({ ok: true, fieldId: el.dataset.swiftdroomId, visible: detector.isVisible(el) });
    } else {
      sendResponse({ ok: false, visible: false });
    }
    return true;
  }

  if (message.type === "FILL_FIELD") {
    let el = detector.getElementByFieldId(message.fieldId);
    if (!el && message.label) {
      el = detector.findFieldByLabel(message.label);
    }
    if (el) {
      const ok = detector.setElementValue(el, message.value);
      sendResponse({ ok: Boolean(ok) });
    } else {
      sendResponse({ ok: false, error: "Field not found" });
    }
    return true;
  }

  if (message.type === "HIGHLIGHT_FIELD") {
    detector.clearHighlights();
    detector.highlightField(message.fieldId, message.color || "#f59e0b");
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "CLEAR_HIGHLIGHTS") {
    detector.clearHighlights();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "GET_PAGE_CONTEXT") {
    sendResponse({
      jobDescription: detector.scrapeJobDescription(),
      meta: detector.scrapePageMeta(),
    });
    return true;
  }

  return false;
});
