chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ ok: true });
  }

  if (message.type === "OPEN_SIDE_PANEL" && sender.tab?.id) {
    chrome.sidePanel.open({ tabId: sender.tab.id });
    sendResponse({ ok: true });
  }

  // Auto-connect: dashboard page sends token + API URL when user is logged in
  if (message.type === "AUTO_CONNECT") {
    const { apiToken, apiUrl } = message;
    if (apiToken && apiUrl) {
      chrome.storage.local.set({ apiToken, apiUrl }, () => {
        sendResponse({ ok: true });
      });
      return true; // keep channel open for async response
    }
  }

  return true;
});
