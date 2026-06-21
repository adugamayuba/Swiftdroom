/**
 * Assigns each user a dedicated @swiftdroom.com email alias.
 * e.g. John Smith → john@swiftdroom.com (or john2@swiftdroom.com if taken)
 *
 * All *@swiftdroom.com mail routes to the catch-all hi@swiftdroom.com inbox
 * via Titan Mail / Hostinger. We poll that inbox via IMAP and route each
 * email to the correct user by matching the To: alias.
 */

import { db } from "@/lib/db";

const DOMAIN = "swiftdroom.com";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
}

/**
 * Get or create a swiftdroom.com alias for a user.
 * Idempotent — returns the existing alias if already assigned.
 */
export async function getOrAssignSwiftdroomEmail(userId: string): Promise<string> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { swiftdroomEmail: true, name: true, email: true },
  });

  if (!user) throw new Error("User not found");
  if (user.swiftdroomEmail) return user.swiftdroomEmail;

  // Derive base slug from name or email local part
  const baseName = user.name ?? user.email.split("@")[0];
  const base = slugify(baseName) || "user";

  // Find unique alias
  let alias = `${base}@${DOMAIN}`;
  let suffix = 2;
  while (true) {
    const taken = await db.user.findUnique({
      where: { swiftdroomEmail: alias },
      select: { id: true },
    });
    if (!taken) break;
    alias = `${base}${suffix}@${DOMAIN}`;
    suffix++;
  }

  await db.user.update({ where: { id: userId }, data: { swiftdroomEmail: alias } });
  console.info(`[swiftdroom-email] assigned ${alias} to user ${userId}`);
  return alias;
}
