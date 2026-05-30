const FIELD_KEY_MAP = {
  firstName: ["first name", "given name", "fname", "legal first"],
  lastName: ["last name", "family name", "surname", "lname", "legal last"],
  fullName: ["full name", "name", "legal name"],
  email: ["email", "e-mail"],
  phone: ["phone", "mobile", "telephone", "cell"],
  location: ["location", "city", "address", "where are you located"],
  linkedinUrl: ["linkedin", "linked in"],
  githubUrl: ["github", "git hub"],
  portfolioUrl: ["portfolio", "website", "personal site"],
};

const FIELD_KEYS = Object.keys(FIELD_KEY_MAP);

function matchFieldKey(label) {
  const normalized = (label || "").toLowerCase().trim();
  for (const [key, patterns] of Object.entries(FIELD_KEY_MAP)) {
    if (patterns.some((p) => normalized.includes(p))) return key;
  }
  return null;
}

function resolveFieldValue(profile, fieldKey) {
  if (!profile || !fieldKey) return null;
  const val = profile[fieldKey];
  return val ? String(val) : null;
}

function resolveWithMappings(label, profile, customMappings, domain) {
  const normalizedLabel = (label || "").toLowerCase().trim();

  if (customMappings && domain) {
    const custom = customMappings.find(
      (m) =>
        m.domain === domain &&
        normalizedLabel.includes(m.labelPattern.toLowerCase())
    );
    if (custom) return resolveFieldValue(profile, custom.fieldKey);
  }

  const key = matchFieldKey(label);
  if (key) return resolveFieldValue(profile, key);

  return null;
}

function isOpenEndedField(field) {
  if (field.isLongForm) return true;
  const label = (field.label || "").toLowerCase();
  const openPatterns = [
    "why",
    "describe",
    "tell us",
    "cover letter",
    "additional",
    "explain",
    "what motivates",
    "experience with",
    "how would you",
    "statement",
  ];
  return openPatterns.some((p) => label.includes(p));
}

const SwiftdroomFieldMapper = {
  FIELD_KEYS,
  matchFieldKey,
  resolveFieldValue,
  resolveWithMappings,
  isOpenEndedField,
};
