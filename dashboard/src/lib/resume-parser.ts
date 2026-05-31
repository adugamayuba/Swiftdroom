/**
 * Extract contact details from plain resume text using regex patterns.
 * Returns only fields we're confident about — caller should keep existing
 * values for anything we can't find.
 */

export interface ExtractedContact {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

export function extractContactFromResume(text: string): ExtractedContact {
  const result: ExtractedContact = {};

  // ── Email ───────────────────────────────────────────────────────────────
  const emailMatch = text.match(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/);
  if (emailMatch) result.email = emailMatch[1];

  // ── Phone ───────────────────────────────────────────────────────────────
  // Matches: +1 (555) 123-4567, 555-123-4567, (555) 123 4567, +44 7911 123456, etc.
  const phoneMatch = text.match(
    /(?:^|\s)(\+?[\d][\d\s\-().]{6,17}[\d])(?=\s|$)/m
  );
  if (phoneMatch) {
    const cleaned = phoneMatch[1].trim();
    // Only accept if it has 7+ digits
    if ((cleaned.match(/\d/g) || []).length >= 7) {
      result.phone = cleaned;
    }
  }

  // ── LinkedIn ─────────────────────────────────────────────────────────────
  const linkedinMatch = text.match(
    /https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9\-_%]+\/?/i
  );
  if (linkedinMatch) {
    result.linkedinUrl = linkedinMatch[0].replace(/\/$/, "");
  } else {
    // bare form: linkedin.com/in/username
    const bare = text.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/i);
    if (bare) result.linkedinUrl = `https://linkedin.com/in/${bare[1]}`;
  }

  // ── GitHub ───────────────────────────────────────────────────────────────
  const githubMatch = text.match(
    /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9\-]+\/?/i
  );
  if (githubMatch) {
    result.githubUrl = githubMatch[0].replace(/\/$/, "");
  } else {
    const bare = text.match(/github\.com\/([a-zA-Z0-9\-]+)/i);
    if (bare) result.githubUrl = `https://github.com/${bare[1]}`;
  }

  // ── Portfolio / personal website ──────────────────────────────────────────
  // Match https URLs that are NOT LinkedIn/GitHub/common domains
  const urlMatches = text.match(/https?:\/\/[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}[^\s,|<>]*/gi) || [];
  const EXCLUDED = /linkedin\.com|github\.com|gmail\.com|yahoo\.com|hotmail\.com|outlook\.com|apple\.com|google\.com|twitter\.com|x\.com|facebook\.com/i;
  const portfolioUrls = urlMatches.filter((u) => !EXCLUDED.test(u));
  if (portfolioUrls.length > 0) {
    result.portfolioUrl = portfolioUrls[0].replace(/[.,;)]+$/, "");
  }

  // ── Name ─────────────────────────────────────────────────────────────────
  // Heuristic: check first 10 lines for a line that looks like a name
  // A name line: 2–5 words, each title-cased, no digits, not a heading keyword
  const HEADING_WORDS = /\b(summary|experience|education|skills|projects|certifications|objective|profile|contact|work|history|references|languages|awards|publications)\b/i;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines.slice(0, 12)) {
    if (HEADING_WORDS.test(line)) continue;
    if (/\d/.test(line)) continue;
    if (/@/.test(line)) continue;
    if (/http/i.test(line)) continue;

    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 5) continue;

    // Each word starts with capital letter
    const allTitleCase = words.every((w) => /^[A-Z]/.test(w));
    if (allTitleCase && words.every((w) => /^[A-Za-z'\-]+$/.test(w))) {
      result.fullName = line;
      break;
    }
  }

  // ── Location ─────────────────────────────────────────────────────────────
  // Common pattern: City, State or City, Country in top section
  // Look in first 20 lines for location-like strings
  const locationPatterns = [
    // City, ST 12345
    /\b([A-Z][a-z]+(?: [A-Z][a-z]+)*),\s*([A-Z]{2})\s+\d{5}\b/,
    // City, State
    /\b([A-Z][a-z]+(?: [A-Z][a-z]+)*),\s*(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/,
    // City, Country
    /\b([A-Z][a-z]+(?: [A-Z][a-z]+)*),\s*(USA|UK|Canada|Australia|Germany|France|India|Nigeria|Kenya|Ghana|South Africa|Netherlands|Sweden|Norway|Denmark|Finland|Switzerland)\b/,
  ];

  const topText = lines.slice(0, 20).join("\n");
  for (const pattern of locationPatterns) {
    const m = topText.match(pattern);
    if (m) {
      result.location = m[0].trim();
      break;
    }
  }

  return result;
}

/** Fields the user must manually confirm if not extracted */
export function getMissingFields(contact: ExtractedContact): string[] {
  const missing: string[] = [];
  if (!contact.fullName) missing.push("fullName");
  if (!contact.email) missing.push("email");
  return missing;
}
