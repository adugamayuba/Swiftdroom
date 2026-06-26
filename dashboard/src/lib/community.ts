import { randomBytes } from "crypto";
import { db } from "./db";
import { getAppUrl } from "./app-url";

export function slugifyCommunityName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "community";
}

export async function createUniqueCommunitySlug(baseName: string): Promise<string> {
  const base = slugifyCommunityName(baseName);
  for (let i = 0; i < 20; i++) {
    const suffix = i === 0 ? "" : `-${i + 1}`;
    const slug = `${base}${suffix}`.slice(0, 56);
    const existing = await db.community.findUnique({ where: { slug } });
    if (!existing) return slug;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export function createCommunityInviteToken(): string {
  return randomBytes(24).toString("hex");
}

export function getCommunitySignupUrl(token: string): string {
  return `${getAppUrl()}/register/community?token=${token}`;
}

export function getCommunityReferralLink(referralCode: string, slug?: string): string {
  const base = getAppUrl().replace(/\/$/, "");
  if (slug) return `${base}/register?ref=${referralCode}&community=${slug}`;
  return `${base}/register?ref=${referralCode}`;
}

export function isCommunityLeader(role: string): boolean {
  return role === "COMMUNITY_LEADER";
}
