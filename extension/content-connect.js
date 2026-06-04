/**
 * Auto-connect content script.
 * Runs on the Swiftdroom dashboard domain.
 * Reads the saved API token from localStorage and sends it to the extension
 * background so the user never has to copy-paste anything manually.
 */

(function () {
  const apiToken = localStorage.getItem("swiftdroom_api_token");
  if (!apiToken) return;

  const metaEl = document.querySelector('meta[name="swiftdroom-api-url"]');
  const fromMeta = metaEl?.getAttribute("content")?.trim();
  let apiUrl = fromMeta ? fromMeta.replace(/\/$/, "") : "";

  if (!apiUrl) {
    const { hostname, protocol, host } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      apiUrl = `${protocol}//${host}`;
    } else if (hostname === "swiftdroom.com" || hostname === "www.swiftdroom.com") {
      apiUrl = "https://swiftdroom.com";
    } else {
      apiUrl = "https://swiftdroom-production.up.railway.app";
    }
  }

  chrome.runtime.sendMessage(
    { type: "AUTO_CONNECT", apiToken, apiUrl },
    () => {
      // Dispatch a custom event so the dashboard page knows the extension
      // is installed and connected (used to show "Connected" badge).
      window.dispatchEvent(
        new CustomEvent("swiftdroom:connected", { detail: { apiUrl } })
      );
    }
  );
})();
