const SwiftdroomAPI = (() => {
  const DEFAULT_URL = "https://swiftdroom.com";

  async function getConfig() {
    const data = await chrome.storage.local.get(["apiToken", "apiUrl"]);
    return {
      apiToken: data.apiToken || "",
      apiUrl: (data.apiUrl || DEFAULT_URL).replace(/\/$/, ""),
    };
  }

  async function setConfig(apiToken, apiUrl) {
    await chrome.storage.local.set({
      apiToken,
      apiUrl: (apiUrl || DEFAULT_URL).replace(/\/$/, ""),
    });
  }

  async function request(path, options = {}) {
    const { apiToken, apiUrl } = await getConfig();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (apiToken) headers["x-api-token"] = apiToken;

    const res = await fetch(`${apiUrl}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(
        SwiftdroomFriendlyErrors.message(data.error, data.code)
      );
      err.code = data.code;
      err.onboardingComplete = data.onboardingComplete;
      err.subscriptionStatus = data.subscriptionStatus;
      throw err;
    }
    return data;
  }

  return {
    getConfig,
    setConfig,
    sync: () => request("/api/extension/sync"),
    generate: (body) =>
      request("/api/generate", { method: "POST", body: JSON.stringify(body) }),
    saveFieldMapping: (body) =>
      request("/api/field-mappings", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    logApplication: (body) =>
      request("/api/applications", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    tailorResume: (body) =>
      request("/api/resume/tailor", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  };
})();
