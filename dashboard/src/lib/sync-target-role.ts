import { db } from "@/lib/db";
import { isGenericRole, normalizeRole } from "@/lib/job-title";

/** Save the role the user is looking for and sync default persona focus. */
export async function syncTargetRole(userId: string, targetRole: string) {
  const role = normalizeRole(targetRole);
  if (!role) return;

  await db.jobSearchPreference.upsert({
    where: { userId },
    create: { userId, targetRole: role },
    update: { targetRole: role },
  });

  const defaultPersona = await db.persona.findFirst({
    where: { userId, isDefault: true },
  });

  if (defaultPersona && isGenericRole(defaultPersona.focus)) {
    await db.persona.update({
      where: { id: defaultPersona.id },
      data: { focus: role },
    });
  }
}
