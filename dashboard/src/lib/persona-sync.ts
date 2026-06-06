import { db } from "./db";

/** Keep the default persona in sync with profile data from onboarding. */
export async function syncDefaultPersonaFromProfile(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { profile: true, personas: { orderBy: { createdAt: "asc" } } },
  });

  if (!user?.profile) return null;

  const defaultPersona =
    user.personas.find((p) => p.isDefault) || user.personas[0];
  if (!defaultPersona) return null;

  const profile = user.profile;
  const profileSummary = [profile.fullName, profile.location]
    .filter(Boolean)
    .join(" — ");

  return db.persona.update({
    where: { id: defaultPersona.id },
    data: {
      resumeText: profile.resumeText || defaultPersona.resumeText,
      resumeFileName: profile.resumeFileName || defaultPersona.resumeFileName,
      resumeUrl: profile.resumeUrl || defaultPersona.resumeUrl,
      summary: defaultPersona.summary.trim() || profileSummary,
      focus: defaultPersona.focus.trim() || "General",
    },
  });
}
