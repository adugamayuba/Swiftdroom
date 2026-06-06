const FIELD_KEY_MAP = {
  firstName: ["first name", "given name", "fname", "legal first", "preferred first"],
  lastName: ["last name", "family name", "surname", "lname", "legal last", "preferred last"],
  fullName: ["full name", "your name", "legal name", "applicant name"],
  email: ["email", "e-mail"],
  phone: ["phone", "mobile", "telephone", "cell", "contact number"],
  location: ["location", "city", "current city", "where do you live", "address line 1"],
  city: ["city", "town", "municipality"],
  state: ["state", "province", "region", "county"],
  country: ["country", "nation", "country/region", "country of residence", "country/territory"],
  zip: ["zip", "postal", "post code", "postcode"],
  linkedinUrl: ["linkedin", "linked in"],
  githubUrl: ["github", "git hub"],
  portfolioUrl: ["portfolio", "website", "personal site", "personal url"],
  workAuthorization: [
    "authorized to work",
    "work authorization",
    "legally authorized",
    "eligible to work",
    "require sponsorship",
    "visa status",
  ],
  referral: ["how did you hear", "referral", "source", "where did you hear"],
  salary: ["salary", "compensation", "pay expectation", "desired pay"],
  startDate: ["start date", "available", "availability", "when can you start"],
};

const FIELD_KEYS = Object.keys(FIELD_KEY_MAP);

const COUNTRY_HINTS = [
  { match: /united states|usa|u\.s\.a?\.?/i, value: "United States" },
  { match: /canada/i, value: "Canada" },
  { match: /united kingdom|uk|great britain/i, value: "United Kingdom" },
  { match: /india/i, value: "India" },
  { match: /germany/i, value: "Germany" },
  { match: /france/i, value: "France" },
  { match: /australia/i, value: "Australia" },
];

function normalize(label) {
  return (label || "").toLowerCase().trim();
}

function matchFieldKey(label) {
  const n = normalize(label);
  for (const [key, patterns] of Object.entries(FIELD_KEY_MAP)) {
    if (patterns.some((p) => n.includes(p))) return key;
  }
  return null;
}

function getPersona(state, personaId) {
  if (!state?.personas?.length) return null;
  return state.personas.find((p) => p.id === personaId) || state.personas.find((p) => p.isDefault);
}

function getResumeText(profile, persona) {
  if (persona?.resumeText?.trim()) return persona.resumeText.trim();
  return profile?.resumeText?.trim() || "";
}

function parseLocation(location) {
  if (!location) return {};
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 1) return { city: parts[0] };
  if (parts.length === 2) return { city: parts[0], state: parts[1] };
  return {
    city: parts[0],
    state: parts[parts.length - 2],
    country: parts[parts.length - 1],
  };
}

function extractFromResume(resumeText) {
  const hints = {};
  const email = resumeText.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0];
  if (email) hints.email = email;
  const phone = resumeText.match(/\+?[\d\s().-]{10,}/)?.[0]?.trim();
  if (phone) hints.phone = phone;
  const linkedin = resumeText.match(/linkedin\.com\/in\/[\w-]+/i)?.[0];
  if (linkedin) hints.linkedinUrl = linkedin.startsWith("http") ? linkedin : `https://${linkedin}`;
  const github = resumeText.match(/github\.com\/[\w-]+/i)?.[0];
  if (github) hints.githubUrl = github.startsWith("http") ? github : `https://${github}`;

  for (const { match, value } of COUNTRY_HINTS) {
    if (match.test(resumeText)) {
      hints.country = value;
      break;
    }
  }
  return hints;
}

function inferCountry(profile, resumeText) {
  const loc = parseLocation(profile?.location || "");
  if (loc.country) return loc.country;
  const fromResume = extractFromResume(resumeText).country;
  if (fromResume) return fromResume;
  if (/united states|usa/i.test(profile?.location || "")) return "United States";
  return null;
}

function inferValue(label, profile, persona) {
  const n = normalize(label);
  const resumeText = getResumeText(profile, persona);
  const resumeHints = extractFromResume(resumeText);
  const loc = parseLocation(profile?.location || "");

  if (n.includes("country")) return inferCountry(profile, resumeText);
  if (n.includes("state") || n.includes("province")) return loc.state || null;
  if (n.includes("city") && !n.includes("country")) return loc.city || null;
  if (n.includes("zip") || n.includes("postal")) return null;

  if (n.includes("hear about") || n.includes("referral") || n.includes("how did you")) {
    if (/linkedin/i.test(resumeText)) return "LinkedIn";
    return null;
  }

  if (n.includes("authorized") || n.includes("sponsorship")) {
    if (/authorized|eligible|no sponsorship/i.test(resumeText)) return "Yes";
    return null;
  }

  if (resumeHints) {
    const key = matchFieldKey(label);
    if (key && resumeHints[key]) return resumeHints[key];
  }

  return null;
}

function resolveFieldValue(profile, fieldKey) {
  if (!profile || !fieldKey) return null;
  const val = profile[fieldKey];
  return val != null && String(val).trim() ? String(val).trim() : null;
}

function resolveWithMappings(label, profile, customMappings, domain) {
  const n = normalize(label);

  if (customMappings?.length && domain) {
    const custom = customMappings.find(
      (m) => m.domain === domain && n.includes(m.labelPattern.toLowerCase())
    );
    if (custom) return resolveFieldValue(profile, custom.fieldKey);
  }

  const key = matchFieldKey(label);
  if (key) return resolveFieldValue(profile, key);

  return null;
}

/**
 * Best-effort answer for a form field (profile → persona resume → heuristics).
 */
function suggestValue(label, profile, persona, customMappings, domain) {
  const fromMapping = resolveWithMappings(label, profile, customMappings, domain);
  if (fromMapping) {
    return { value: fromMapping, source: "profile" };
  }

  const key = matchFieldKey(label);
  if (key) {
    const profileVal = resolveFieldValue(profile, key);
    if (profileVal) return { value: profileVal, source: "profile" };
  }

  const inferred = inferValue(label, profile, persona);
  if (inferred) {
    return { value: inferred, source: "resume" };
  }

  return { value: "", source: "empty" };
}

function isOpenEndedField(field) {
  if (field.isSelect || field.isCombobox || field.tag === "select") return false;
  if (field.isLongForm) return true;
  const label = normalize(field.label);
  const openPatterns = [
    "why",
    "describe",
    "tell us",
    "cover letter",
    "additional information",
    "additional comments",
    "explain",
    "what motivates",
    "experience with",
    "how would you",
    "statement",
    "anything else",
    "notes",
  ];
  if (openPatterns.some((p) => label.includes(p))) return true;
  if (field.tag === "textarea") return true;
  return false;
}

const SwiftdroomFieldMapper = {
  FIELD_KEYS,
  matchFieldKey,
  resolveFieldValue,
  resolveWithMappings,
  suggestValue,
  inferValue,
  isOpenEndedField,
  getPersona,
  getResumeText,
};
