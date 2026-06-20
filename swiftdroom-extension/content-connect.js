/**
 * Auto-connect content script.
 * Runs on the Swiftdroom dashboard domain.
 * Reads the saved API token from localStorage and sends it to the extension
 * background so the user never has to copy-paste anything manually.
 */

(function () {
  let connected = false;

  function resolveApiUrl() {
    const metaEl = document.querySelector('meta[name="swiftdroom-api-url"]');
    const fromMeta = metaEl?.getAttribute("content")?.trim();
    if (fromMeta) return fromMeta.replace(/\/$/, "");

    const { hostname, protocol, host } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return `${protocol}//${host}`;
    }
    if (hostname === "swiftdroom.com" || hostname === "www.swiftdroom.com") {
      return "https://swiftdroom-production.up.railway.app";
    }
    return `${protocol}//${host}`;
  }

  function tryConnect() {
    if (connected) return true;

    const apiToken = localStorage.getItem("swiftdroom_api_token");
    if (!apiToken) return false;

    const apiUrl = resolveApiUrl();
    chrome.runtime.sendMessage(
      { type: "AUTO_CONNECT", apiToken, apiUrl },
      () => {
        if (chrome.runtime.lastError) return;
        connected = true;
        window.dispatchEvent(
          new CustomEvent("swiftdroom:connected", { detail: { apiUrl } })
        );
      }
    );
    return true;
  }

  tryConnect();
  window.addEventListener("swiftdroom:request-connect", tryConnect);

  let attempts = 0;
  const poll = window.setInterval(() => {
    if (connected || tryConnect() || ++attempts >= 20) {
      window.clearInterval(poll);
    }
  }, 1000);
})();
