/** Well-known employers to target on each feed refresh (rotated to save API quota). */
export const TOP_TECH_COMPANIES = [
  "Google",
  "Meta",
  "Amazon",
  "Apple",
  "Microsoft",
  "Anthropic",
  "OpenAI",
  "Netflix",
  "Stripe",
  "NVIDIA",
  "Salesforce",
  "LinkedIn",
  "Uber",
  "Airbnb",
  "TikTok",
  "Spotify",
  "Databricks",
  "Snowflake",
  "Coinbase",
  "Adobe",
  "Oracle",
  "IBM",
  "Intel",
  "Palantir",
  "Figma",
  "Notion",
  "Shopify",
  "Square",
  "Block",
  "Robinhood",
] as const;

const ALIASES: Record<string, string[]> = {
  google: ["google", "alphabet", "youtube", "waymo"],
  meta: ["meta", "facebook", "instagram", "whatsapp"],
  amazon: ["amazon", "aws", "amazon web services"],
  apple: ["apple"],
  microsoft: ["microsoft", "github"],
  anthropic: ["anthropic"],
  openai: ["openai"],
  netflix: ["netflix"],
  stripe: ["stripe"],
  nvidia: ["nvidia"],
  salesforce: ["salesforce"],
  linkedin: ["linkedin"],
  uber: ["uber"],
  airbnb: ["airbnb"],
  tiktok: ["tiktok", "bytedance"],
  spotify: ["spotify"],
  databricks: ["databricks"],
  snowflake: ["snowflake"],
  coinbase: ["coinbase"],
  adobe: ["adobe"],
  oracle: ["oracle"],
  ibm: ["ibm"],
  intel: ["intel"],
  palantir: ["palantir"],
  figma: ["figma"],
  notion: ["notion"],
  shopify: ["shopify"],
  square: ["square", "block"],
  block: ["block", "square", "cash app"],
  robinhood: ["robinhood"],
};

const NORMALIZED = TOP_TECH_COMPANIES.map((name) => name.toLowerCase());

/** Pick a subset of companies to search this refresh (rotates daily). */
export function pickCompaniesForRefresh(
  seed: string,
  count = 5
): string[] {
  const day = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (const ch of `${seed}:${day}`) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }

  const order = [...TOP_TECH_COMPANIES].sort((a, b) => {
    const ha =
      (hash ^ a.split("").reduce((n, c) => n + c.charCodeAt(0), 0)) >>> 0;
    const hb =
      (hash ^ b.split("").reduce((n, c) => n + c.charCodeAt(0), 0)) >>> 0;
    return ha - hb;
  });

  return order.slice(0, Math.min(count, order.length));
}

export function isTopTechCompany(companyName: string): string | null {
  const lower = companyName.toLowerCase();
  for (const name of NORMALIZED) {
    const aliases = ALIASES[name] || [name];
    if (aliases.some((alias) => lower.includes(alias))) {
      return TOP_TECH_COMPANIES.find((c) => c.toLowerCase() === name) || name;
    }
  }
  return null;
}
