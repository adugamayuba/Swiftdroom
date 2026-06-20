const FIELD_KEY_MAP = {
  firstName: ["first name", "given name", "fname", "legal first", "preferred first"],
  lastName: ["last name", "family name", "surname", "lname", "legal last", "preferred last"],
  fullName: ["full name", "legal name", "applicant name", "your name", "candidate name"],
  email: ["email address", "e-mail", "email"],
  phone: ["phone number", "mobile number", "telephone", "mobile phone", "cell phone", "contact number", "phone"],
  location: ["current location", "where do you live", "home address", "street address", "address line 1", "location"],
  city: ["city", "town", "municipality"],
  state: ["state/province", "state or province", "province", "region", "county", "state"],
  country: ["country/region", "country of residence", "country/territory", "country"],
  zip: ["zip code", "postal code", "post code", "postcode", "zip"],
  linkedinUrl: ["linkedin profile", "linkedin url", "linkedin"],
  githubUrl: ["github profile", "github url", "github"],
  portfolioUrl: ["portfolio url", "personal website", "personal site", "portfolio website", "portfolio"],
  workAuthorization: [
    "authorized to work",
    "work authorization",
    "legally authorized",
    "eligible to work",
    "require sponsorship",
    "visa sponsorship",
    "visa status",
  ],
  referral: ["how did you hear", "where did you hear", "referral source", "application source"],
  salary: ["salary expectation", "expected salary", "desired salary", "compensation", "pay expectation"],
  startDate: ["start date", "available start", "when can you start", "earliest start"],
};

const EMPLOYER_FIELD_PATTERNS = [
  "company name",
  "employer name",
  "organization name",
  "organisation name",
  "current employer",
  "previous employer",
  "company website",
  "employer website",
  "supervisor",
  "manager name",
  "reference name",
  "company you work",
  "name of company",
  "name of employer",
];

const SKIP_AUTOFILL_PATTERNS = [
  ...EMPLOYER_FIELD_PATTERNS,
  "founder",
  "ceo name",
  "hiring manager",
];

const FIELD_KEYS = Object.keys(FIELD_KEY_MAP);

const COUNTRY_HINTS = [
  { match: /united states|usa|u\.s\.a?\.?/i, value: "United States" },
  { match: /canada/i, value: "Canada" },
  { match: /united kingdom|uk|great britain/i, value: "United Kingdom" },
  { match: /united arab emirates|uae|dubai|abu dhabi/i, value: "United Arab Emirates" },
  { match: /saudi arabia|ksa|riyadh/i, value: "Saudi Arabia" },
  { match: /india/i, value: "India" },
  { match: /germany/i, value: "Germany" },
  { match: /france/i, value: "France" },
  { match: /australia/i, value: "Australia" },
];

const OPEN_ENDED_PATTERNS = [
  "why ",
  "why do",
  "why are",
  "describe ",
  "tell us",
  "tell me",
  "cover letter",
  "additional information",
  "additional comments",
  "explain ",
  "what motivates",
  "experience with",
  "how would you",
  "how do you",
  "what is your",
  "what are your",
  "anything else",
  "statement of",
  "summary of qualifications",
  "about yourself",
  "about you",
  "motivation",
  "interest in",
  "proud of",
  "accomplishment",
  "challenge you",
  "strength",
  "weakness",
];

const SMART_GUESS_PATTERNS = [
  { key: "yearsExperience", patterns: ["years of experience", "years experience", "total experience", "how many years"] },
  { key: "currentTitle", patterns: ["current title", "job title", "most recent title", "current role", "position title"] },
  { key: "degree", patterns: ["degree", "highest degree", "level of education", "education level"] },
  { key: "university", patterns: ["university", "college", "school name", "institution", "alma mater"] },
  { key: "graduationYear", patterns: ["graduation year", "year graduated", "grad year"] },
  { key: "skills", patterns: ["key skills", "top skills", "relevant skills", "technical skills"] },
  { key: "languages", patterns: ["languages spoken", "language proficiency", "languages you speak"] },
];

function normalize(label) {
  return (label || "").toLowerCase().replace(/\*/g, "").replace(/\s+/g, " ").trim();
}

function shouldSkipAutofill(label) {
  const n = normalize(label);
  if (!n || n.length > 180) return true;
  if (/https?:\/\//.test(n)) return true;
  return SKIP_AUTOFILL_PATTERNS.some((p) => n.includes(p));
}

function matchFieldKey(label) {
  const n = normalize(label);
  if (shouldSkipAutofill(label)) return null;

  let bestKey = null;
  let bestLen = 0;

  for (const [key, patterns] of Object.entries(FIELD_KEY_MAP)) {
    for (const p of patterns) {
      if (n.includes(p) && p.length > bestLen) {
        bestKey = key;
        bestLen = p.length;
      }
    }
  }

  if (bestKey === "fullName" && (n.includes("company") || n.includes("employer") || n.includes("school"))) {
    return null;
  }

  if (bestKey === "portfolioUrl" && (n.includes("company") || n.includes("employer"))) {
    return null;
  }

  if (bestKey === "location" && (n.includes("company") || n.includes("employer") || n.includes("office"))) {
    return null;
  }

  if (bestKey === "referral" && n.includes("source code")) {
    return null;
  }

  return bestKey;
}

function matchSmartGuessKey(label) {
  const n = normalize(label);
  for (const { key, patterns } of SMART_GUESS_PATTERNS) {
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
  if (!resumeText?.trim()) return {};
  const hints = {};

  const email = resumeText.match(/[\w.+-]+@[\w.-]+\.\w{2,}/)?.[0];
  if (email) hints.email = email;

  const phone = resumeText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)?.[0]?.trim();
  if (phone) hints.phone = phone;

  const linkedin = resumeText.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i)?.[0];
  if (linkedin) hints.linkedinUrl = linkedin.startsWith("http") ? linkedin : `https://${linkedin}`;

  const github = resumeText.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w-]+/i)?.[0];
  if (github) hints.githubUrl = github.startsWith("http") ? github : `https://${github}`;

  for (const { match, value } of COUNTRY_HINTS) {
    if (match.test(resumeText)) {
      hints.country = value;
      break;
    }
  }

  const yearsMatch = resumeText.match(/(\d{1,2})\+?\s*(?:years|yrs)(?:\s+of)?\s+(?:experience|exp)/i);
  if (yearsMatch) hints.yearsExperience = yearsMatch[1];

  const degreeMatch = resumeText.match(
    /\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|M\.?B\.?A\.?|Ph\.?D\.?|Bachelor(?:'s)?|Master(?:'s)?|Doctorate)[^.\n]{0,60}/i
  );
  if (degreeMatch) hints.degree = degreeMatch[0].trim().replace(/\s+/g, " ");

  const uniMatch = resumeText.match(
    /(?:University|College|Institute|School)\s+of\s+[\w\s]+|[\w\s]+(?:University|College|Institute)/i
  );
  if (uniMatch) hints.university = uniMatch[0].trim().replace(/\s+/g, " ");

  const gradYear = resumeText.match(/(?:graduated|class of|'\s*)\s*(20\d{2}|19\d{2})/i);
  if (gradYear) hints.graduationYear = gradYear[1];

  const lines = resumeText.split("\n").map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 8)) {
    if (line.length > 4 && line.length < 80 && !line.includes("@") && !/^\d/.test(line)) {
      if (/engineer|developer|manager|analyst|designer|director|lead|consultant|specialist/i.test(line)) {
        hints.currentTitle = line;
        break;
      }
    }
  }

  const skillsSection = resumeText.match(/skills?\s*[:\-]?\s*([^\n]+)/i)?.[1];
  if (skillsSection && skillsSection.length > 3) {
    hints.skills = skillsSection.split(/[,|•·]/).slice(0, 8).map((s) => s.trim()).filter(Boolean).join(", ");
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
  if (shouldSkipAutofill(label)) return null;

  const resumeText = getResumeText(profile, persona);
  const resumeFacts = extractFromResume(resumeText);
  const loc = parseLocation(profile?.location || "");

  const smartKey = matchSmartGuessKey(label);
  if (smartKey && resumeFacts[smartKey]) return resumeFacts[smartKey];

  if (n.includes("country") && !n.includes("company")) return inferCountry(profile, resumeText);
  if ((n.includes("state") || n.includes("province")) && !n.includes("company") && !n.includes("statement")) {
    return loc.state || null;
  }
  if (n.includes("city") && !n.includes("country") && !n.includes("company")) return loc.city || null;
  if (n.includes("zip") || n.includes("postal")) return null;

  if (n.includes("hear about") || n.includes("referral") || n.includes("how did you")) {
    if (/linkedin/i.test(resumeText)) return "LinkedIn";
    return null;
  }

  if (n.includes("authorized") || n.includes("sponsorship") || n.includes("visa")) {
    if (/authorized|eligible|citizen|permanent resident|no sponsorship|us citizen|uae national/i.test(resumeText)) {
      return "Yes";
    }
    return null;
  }

  if (n.includes("gender") || n.includes("race") || n.includes("ethnicity") || n.includes("veteran") || n.includes("disability")) {
    return null;
  }

  const key = matchFieldKey(label);
  if (key && resumeFacts[key]) return resumeFacts[key];

  return null;
}

function resolveFieldValue(profile, fieldKey) {
  if (!profile || !fieldKey) return null;
  const val = profile[fieldKey];
  return val != null && String(val).trim() ? String(val).trim() : null;
}

function resolveWithMappings(label, profile, customMappings, domain) {
  const n = normalize(label);
  if (shouldSkipAutofill(label)) return null;

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

function suggestValue(label, profile, persona, customMappings, domain) {
  if (shouldSkipAutofill(label)) {
    return { value: "", source: "empty" };
  }

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

  const label = normalize(field.label);
  if (!label) return false;

  if (OPEN_ENDED_PATTERNS.some((p) => label.includes(p))) return true;

  if (field.isLongForm) return true;
  if (field.tag === "textarea") return true;

  if (label.includes("?") && label.length > 20) return true;

  return false;
}

function needsAIGeneration(field) {
  if (isOpenEndedField(field)) return true;
  const label = normalize(field.label);
  if (label.includes("cover letter")) return true;
  if (matchSmartGuessKey(label) && !(field._draftValue || "").trim()) {
    return label.length > 15;
  }
  return false;
}

function isCoverLetterField(field) {
  const label = normalize(field.label);
  return label.includes("cover letter") || label.includes("letter of interest");
}

function suggestPersonaId(personas, pageContext) {
  if (!personas?.length) return null;
  const role = (pageContext?.meta?.role || "").toLowerCase();
  const jd = (pageContext?.jobDescription || "").toLowerCase();
  const haystack = `${role} ${jd}`;

  let best = personas.find((p) => p.isDefault) || personas[0];
  let bestScore = 0;

  for (const persona of personas) {
    let score = persona.isDefault ? 1 : 0;
    const focus = (persona.focus || "").toLowerCase();
    const name = (persona.name || "").toLowerCase();
    const skills = (persona.skills || "").toLowerCase();

    for (const token of [...focus.split(/\W+/), ...name.split(/\W+/), ...skills.split(/[,|]/)] ) {
      const t = token.trim();
      if (t.length < 3) continue;
      if (haystack.includes(t)) score += t.length;
    }

    if (score > bestScore) {
      bestScore = score;
      best = persona;
    }
  }

  return best?.id || null;
}

const SwiftdroomFieldMapper = {
  FIELD_KEYS,
  matchFieldKey,
  matchSmartGuessKey,
  resolveFieldValue,
  resolveWithMappings,
  suggestValue,
  inferValue,
  isOpenEndedField,
  needsAIGeneration,
  isCoverLetterField,
  shouldSkipAutofill,
  getPersona,
  getResumeText,
  suggestPersonaId,
  extractFromResume,
};
