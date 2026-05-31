/**
 * Auto-connect content script.
 * Runs on the Swiftdroom dashboard domain.
 * Reads the saved API token from localStorage and sends it to the extension
 * background so the user never has to copy-paste anything manually.
 */

(function () {
  const apiToken = localStorage.getItem("swiftdroom_api_token");
  if (!apiToken) return;

  // The API URL is injected by the dashboard via a <meta> tag.
  // Falls back to the production Railway URL.
  const metaEl = document.querySelector('meta[name="swiftdroom-api-url"]');
  const apiUrl =
    metaEl?.getAttribute("content") ||
    "https://swiftdroom-production.up.railway.app";

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
