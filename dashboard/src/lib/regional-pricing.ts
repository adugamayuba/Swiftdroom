import type { Plan } from "./plans";

const USD_TO_AED = 3.67;

const MENA_COUNTRY_CODES = new Set([
  "AE", "SA", "QA", "BH", "KW", "OM", "EG", "JO", "LB", "IQ", "YE", "SY", "PS", "MA", "TN", "DZ", "LY", "SD",
]);

export function isMenaRegion(countryCode: string | null | undefined) {
  if (!countryCode) return false;
  return MENA_COUNTRY_CODES.has(countryCode.toUpperCase());
}

export function formatRegionalPrice(usd: number, countryCode: string | null | undefined) {
  if (isMenaRegion(countryCode)) {
    const aed = Math.round(usd * USD_TO_AED);
    return { amount: aed, currency: "AED", symbol: "AED", usdNote: `$${usd.toFixed(2)} USD` };
  }
  return { amount: usd, currency: "USD", symbol: "$", usdNote: null };
}

export function formatPlanPrice(plan: Plan, countryCode: string | null | undefined) {
  const regional = formatRegionalPrice(plan.price, countryCode);
  if (regional.currency === "AED") {
    return { priceLabel: `${regional.amount} AED`, suffix: "/month", sublabel: regional.usdNote };
  }
  return { priceLabel: plan.priceLabel, suffix: "/month", sublabel: null };
}

export async function detectCountryCode(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("https://ipapi.co/country_code/", { cache: "no-store" });
    if (!res.ok) return null;
    const code = (await res.text()).trim();
    return code.length === 2 ? code.toUpperCase() : null;
  } catch {
    return null;
  }
}
