const detector = window.SwiftdroomFormDetector;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SCAN_FIELDS") {
    const fields = detector.detectFields();
    sendResponse({ fields });
    return true;
  }

  if (message.type === "FILL_FIELD") {
    const el = detector.getElementByFieldId(message.fieldId);
    if (el) {
      detector.setElementValue(el, message.value);
      sendResponse({ ok: true });
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
