import type { Persona, Profile } from "@prisma/client";
import type { RawJobListing } from "@/lib/job-search";

const ATS_BOOST: Record<string, number> = {
  greenhouse: 12,
  lever: 12,
  workday: 10,
  ashby: 8,
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

export function scoreJobForPersona(
  job: RawJobListing,
  persona: Persona,
  profile: Profile | null
): { score: number; matchReason: string } {
  const title = job.title.toLowerCase();
  const desc = job.description.toLowerCase();
  const hay = `${title} ${desc}`;

  const focusTokens = tokenize(persona.focus);
  const skillTokens = persona.skills
    .split(/[,;\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 2);

  let score = 0;
  const reasons: string[] = [];

  for (const token of focusTokens) {
    if (title.includes(token)) {
      score += 18;
      reasons.push(token);
    } else if (hay.includes(token)) {
      score += 8;
    }
  }

  let skillHits = 0;
  for (const skill of skillTokens.slice(0, 12)) {
    if (hay.includes(skill)) {
      score += 6;
      skillHits++;
    }
  }
  if (skillHits >= 3) reasons.push(`${skillHits} skills match`);

  if (profile?.location) {
    const loc = profile.location.toLowerCase();
    if (loc && job.location.toLowerCase().includes(loc.split(",")[0])) {
      score += 10;
      reasons.push("location fit");
    }
  }

  if (job.atsType && ATS_BOOST[job.atsType]) {
    score += ATS_BOOST[job.atsType];
    reasons.push(`${job.atsType} application`);
  }

  if (job.remote) score += 4;

  score = Math.min(100, Math.round(score));

  const matchReason =
    reasons.length > 0
      ? `Matches your persona: ${[...new Set(reasons)].slice(0, 3).join(", ")}`
      : persona.focus
        ? `Related to your ${persona.focus} focus`
        : "Recommended based on your profile";

  return { score: Math.max(score, 15), matchReason };
}
