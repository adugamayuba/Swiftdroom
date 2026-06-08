import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { db } from "@/lib/db";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";

const updateSchema = z.object({
  login: z.boolean().optional(),
  applications: z.boolean().optional(),
  billing: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  return NextResponse.json({
    login: gate.user.emailNotifyLogin,
    applications: gate.user.emailNotifyApplications,
    billing: gate.user.emailNotifyBilling,
  });
}

export async function PATCH(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const updated = await db.user.update({
      where: { id: gate.user.id },
      data: {
        ...(data.login !== undefined
          ? { emailNotifyLogin: data.login }
          : {}),
        ...(data.applications !== undefined
          ? { emailNotifyApplications: data.applications }
          : {}),
        ...(data.billing !== undefined ? { emailNotifyBilling: data.billing } : {}),
      },
      select: {
        emailNotifyLogin: true,
        emailNotifyApplications: true,
        emailNotifyBilling: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
    }
    console.error("Notification settings error:", error);
    return NextResponse.json(
      { error: friendlyUserMessage("Update failed") },
      { status: 500 }
    );
  }
}
