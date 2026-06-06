"use client";

import { useEffect, useState } from "react";

const API_TOKEN_KEY = "swiftdroom_api_token";

/** Save API token and ask the content script to connect to the extension. */
export function persistApiToken(apiToken: string) {
  localStorage.setItem(API_TOKEN_KEY, apiToken);
  window.dispatchEvent(new CustomEvent("swiftdroom:request-connect"));
}

export function requestExtensionConnect() {
  window.dispatchEvent(new CustomEvent("swiftdroom:request-connect"));
}

export function useExtensionConnected() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const onConnected = () => setConnected(true);
    window.addEventListener("swiftdroom:connected", onConnected);

    requestExtensionConnect();
    const interval = window.setInterval(requestExtensionConnect, 1500);
    const stop = window.setTimeout(() => window.clearInterval(interval), 12000);

    return () => {
      window.removeEventListener("swiftdroom:connected", onConnected);
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, []);

  return connected;
}
