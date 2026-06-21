/** Curated employers with verified public Greenhouse / Lever board tokens. */
export type AtsBoard = {
  name: string;
  greenhouse?: string;
  lever?: string;
};

export const ATS_COMPANIES: AtsBoard[] = [
  // Greenhouse
  { name: "Anthropic",   greenhouse: "anthropic" },
  { name: "Stripe",      greenhouse: "stripe" },
  { name: "Airbnb",      greenhouse: "airbnb" },
  { name: "Databricks",  greenhouse: "databricks" },
  { name: "Coinbase",    greenhouse: "coinbase" },
  { name: "Figma",       greenhouse: "figma" },
  { name: "Discord",     greenhouse: "discord" },
  { name: "Robinhood",   greenhouse: "robinhood" },
  { name: "LinkedIn",    greenhouse: "linkedin" },
  { name: "Block",       greenhouse: "block" },
  { name: "Datadog",     greenhouse: "datadog" },
  { name: "MongoDB",     greenhouse: "mongodb" },
  { name: "Cloudflare",  greenhouse: "cloudflare" },
  { name: "Vercel",      greenhouse: "vercel" },
  { name: "Twilio",      greenhouse: "twilio" },
  { name: "Asana",       greenhouse: "asana" },
  { name: "Dropbox",     greenhouse: "dropbox" },
  { name: "Instacart",   greenhouse: "instacart" },
  { name: "Reddit",      greenhouse: "reddit" },
  { name: "Pinterest",   greenhouse: "pinterest" },
  { name: "Lyft",        greenhouse: "lyft" },
  // Lever — verified slugs (boards at jobs.lever.co/{slug})
  { name: "Spotify",     lever: "spotify" },
  { name: "Brex",        lever: "brex" },
  { name: "Notion",      lever: "notion" },
  { name: "Airtable",    lever: "airtable" },
  { name: "Webflow",     lever: "webflow" },
  { name: "Retool",      lever: "retool" },
  { name: "Scale AI",    lever: "scaleai" },
  { name: "Gusto",       lever: "gusto" },
];

/** Rotate a subset of ATS boards (daily) to spread load across ingest runs. */
export function pickAtsCompaniesForRun(seed: string, count = 8): AtsBoard[] {
  const day = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (const ch of `${seed}:${day}`) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }

  const order = [...ATS_COMPANIES].sort((a, b) => {
    const ha =
      (hash ^ a.name.split("").reduce((n, c) => n + c.charCodeAt(0), 0)) >>> 0;
    const hb =
      (hash ^ b.name.split("").reduce((n, c) => n + c.charCodeAt(0), 0)) >>> 0;
    return ha - hb;
  });

  return order.slice(0, Math.min(count, order.length));
}
