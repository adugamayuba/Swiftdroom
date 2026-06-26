import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import {
  createCommunityInviteToken,
  getCommunitySignupUrl,
} from "@/lib/community";
import { sendCommunityLeaderInviteEmail } from "@/lib/email";

const inviteSchema = z.object({
  email: z.string().email(),
  communityName: z.string().optional(),
});

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [invites, communities] = await Promise.all([
    db.communityInvite.findMany({
      where: { acceptedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.community.findMany({
      include: {
        leader: { select: { id: true, email: true, name: true, referralCode: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return NextResponse.json({ invites, communities });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email, communityName } = inviteSchema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, role: true },
    });
    if (existingUser) {
      if (existingUser.role === "COMMUNITY_LEADER") {
        return NextResponse.json(
          { error: "This email already has community access." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "This email is already registered as a regular user." },
        { status: 400 }
      );
    }

    const token = createCommunityInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Replace any pending invite for this email
    await db.communityInvite.deleteMany({
      where: { email: normalizedEmail, acceptedAt: null },
    });

    const invite = await db.communityInvite.create({
      data: {
        email: normalizedEmail,
        token,
        communityName: communityName?.trim() ?? "",
        expiresAt,
      },
    });

    const signupUrl = getCommunitySignupUrl(token);
    await sendCommunityLeaderInviteEmail({
      email: normalizedEmail,
      communityName: invite.communityName || undefined,
      signupUrl,
    });

    return NextResponse.json({
      ok: true,
      invite: {
        id: invite.id,
        email: invite.email,
        communityName: invite.communityName,
        expiresAt: invite.expiresAt,
        signupUrl,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }
    console.error("[admin communities invite]", err);
    return NextResponse.json({ error: "Failed to send invite." }, { status: 500 });
  }
}
