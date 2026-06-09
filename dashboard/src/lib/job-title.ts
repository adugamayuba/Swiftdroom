const GENERIC_FOCUS = /^(general|default|other|any|misc|n\/a|none)$/i;

const TITLE_KEYWORDS =
  /\b(engineer|developer|designer|manager|analyst|specialist|architect|consultant|scientist|coordinator|director|lead|administrator|recruiter|writer|marketer|accountant|nurse|teacher|lawyer|paralegal|pharmacist|therapist|technician)\b/i;

const TITLE_LINE =
  /\b((?:senior|staff|principal|lead|junior|mid[- ]level|entry[- ]level|associate|head of|vp of|director of|chief)\s+)?([a-z][a-z0-9/+\-]*(?:\s+[a-z][a-z0-9/+\-]*){0,4})\s*(?:engineer|developer|designer|manager|analyst|specialist|architect|consultant|scientist|coordinator|director|administrator|recruiter|writer|marketer)\b/i;

const SECTION_BREAK =
  /\b(experience|work history|employment|professional experience|education|skills|projects|summary|objective|certifications)\b/i;

/** Guess a job title from resume text (most recent / headline role). */
export function extractJobTitleFromResume(text: string): string {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 80);

  // Headline in first few lines (often right under name)
  for (const line of lines.slice(0, 8)) {
    if (SECTION_BREAK.test(line)) break;
    if (/@|https?:|linkedin|github|\d{3}/i.test(line)) continue;
    const match = line.match(TITLE_LINE);
    if (match) {
      return normalizeRole(match[0]);
    }
    if (TITLE_KEYWORDS.test(line) && !GENERIC_FOCUS.test(line)) {
      return normalizeRole(line);
    }
  }

  // First experience block: "Software Engineer — Company" or "Software Engineer at Company"
  const experienceIdx = lines.findIndex((l) => SECTION_BREAK.test(l));
  const expLines = experienceIdx >= 0 ? lines.slice(experienceIdx + 1, experienceIdx + 8) : lines.slice(8, 16);

  for (const line of expLines) {
    const atSplit = line.split(/\s+(?:at|@|\||–|—)\s+/i)[0]?.trim();
    if (!atSplit) continue;
    const match = atSplit.match(TITLE_LINE);
    if (match) return normalizeRole(match[0]);
    if (TITLE_KEYWORDS.test(atSplit)) return normalizeRole(atSplit);
  }

  return "";
}

export function normalizeRole(role: string): string {
  return role
    .replace(/\s+/g, " ")
    .replace(/^[\W_]+|[\W_]+$/g, "")
    .trim()
    .slice(0, 120);
}

export function isGenericRole(role: string): boolean {
  return !role.trim() || GENERIC_FOCUS.test(role.trim());
}

/** Resolve the role used for job search (explicit target wins). */
export function resolveTargetRole(
  targetRole: string,
  personaFocus: string,
  personaName: string,
  resumeSnippet: string,
  skills = ""
): string {
  const explicit = normalizeRole(targetRole);
  if (explicit && !isGenericRole(explicit)) return explicit;

  const focus = normalizeRole(personaFocus);
  if (focus && !isGenericRole(focus)) return focus;

  const fromResume = extractJobTitleFromResume(resumeSnippet);
  if (fromResume) return fromResume;

  const skillLine = skills
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2)
    .slice(0, 3)
    .join(" ");
  if (skillLine) return skillLine.slice(0, 120);

  const name = personaName.replace(/resume|cv|default/gi, "").trim();
  if (name && !isGenericRole(name)) return name.slice(0, 120);

  return "software engineer";
}
