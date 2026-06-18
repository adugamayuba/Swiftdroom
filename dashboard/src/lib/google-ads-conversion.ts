declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const CONVERSION_LABEL =
  process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim() || "";

export function trackGoogleAdsConversion(value?: number) {
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim() || "AW-18229964298";
  if (typeof window === "undefined" || !window.gtag) return;

  if (CONVERSION_LABEL) {
    window.gtag("event", "conversion", {
      send_to: `${adsId}/${CONVERSION_LABEL}`,
      value: value ?? 1,
      currency: "USD",
    });
  }

  window.gtag("event", "purchase", {
    send_to: adsId,
    value: value ?? 1,
    currency: "USD",
  });
}
