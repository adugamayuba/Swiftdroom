import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createUniqueCommunitySlug,
  getCommunityReferralLink,
  slugifyCommunityName,
} from "@/lib/community";
import { getReferralLink, REFERRAL_CONFIG } from "@/lib/referrals";
import { apiError } from "@/lib/user-messages";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

async function requireCommunityLeader(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) return { error: apiError("Unauthorized", 401) };
  if (user.role !== "COMMUNITY_LEADER") {
    return { error: apiError("Community access required.", 403) };
  }
  return { user };
}

export async function GET(request: NextRequest) {
  const auth = await requireCommunityLeader(request);
  if ("error" in auth && auth.error) return auth.error;
  const { user } = auth;

  const community = await db.community.findUnique({
    where: { leaderId: user!.id },
  });
  if (!community) {
    return apiError("Community not found.", 404);
  }

  const [referrals, earnings] = await Promise.all([
    db.user.findMany({
      where: { referredById: user!.id },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.referralEarning.findMany({
      where: { referrerId: user!.id },
      include: { referredUser: { select: { email: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totals = { pending: 0, eligible: 0, paid: 0, canceled: 0 };
  for (const e of earnings) {
    const key = e.status.toLowerCase() as keyof typeof totals;
    if (key in totals) totals[key] += e.commissionAmount;
  }

  return NextResponse.json({
    community: {
      id: community.id,
      name: community.name,
      slug: community.slug,
      logoUrl: community.logoUrl,
      description: community.description,
      website: community.website,
    },
    referralCode: user!.referralCode,
    referralLink: getCommunityReferralLink(user!.referralCode, community.slug),
    standardReferralLink: getReferralLink(user!.referralCode),
    config: REFERRAL_CONFIG,
    referrals: referrals.map((r) => ({
      id: r.id,
      name: r.name || "Member",
      email: maskEmail(r.email),
      plan: r.plan,
      subscribed: r.subscriptionStatus === "ACTIVE" || r.subscriptionStatus === "TRIALING",
      joinedAt: r.createdAt,
    })),
    earnings: earnings.map((e) => ({
      id: e.id,
      referredEmail: maskEmail(e.referredUser.email),
      referredName: e.referredUser.name,
      plan: e.plan,
      commissionAmount: e.commissionAmount,
      status: e.status,
      eligibleAt: e.eligibleAt,
      paidAt: e.paidAt,
      createdAt: e.createdAt,
    })),
    totals,
  });
}

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  logoUrl: z.string().url().or(z.literal("")).optional(),
  description: z.string().max(2000).optional(),
  website: z.string().url().or(z.literal("")).optional(),
  slug: z.string().min(2).max(56).optional(),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireCommunityLeader(request);
  if ("error" in auth && auth.error) return auth.error;
  const { user } = auth;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const community = await db.community.findUnique({
      where: { leaderId: user!.id },
    });
    if (!community) return apiError("Community not found.", 404);

    let slug = community.slug;
    if (data.slug !== undefined) {
      const candidate = slugifyCommunityName(data.slug);
      if (candidate !== community.slug) {
        const taken = await db.community.findUnique({ where: { slug: candidate } });
        if (taken && taken.id !== community.id) {
          return apiError("That community URL is already taken.", 400);
        }
        slug = candidate;
      }
    } else if (data.name && data.name !== community.name) {
      slug = await createUniqueCommunitySlug(data.name);
    }

    const updated = await db.community.update({
      where: { id: community.id },
      data: {
        name: data.name ?? community.name,
        slug,
        logoUrl: data.logoUrl ?? community.logoUrl,
        description: data.description ?? community.description,
        website: data.website ?? community.website,
      },
    });

    return NextResponse.json({
      community: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        logoUrl: updated.logoUrl,
        description: updated.description,
        website: updated.website,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return apiError("Invalid community details.", 400);
    }
    console.error("[community PATCH]", err);
    return apiError("Failed to update community.", 500);
  }
}
