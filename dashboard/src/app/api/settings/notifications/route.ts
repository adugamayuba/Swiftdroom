import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";

const updateSchema = z.object({
  login: z.boolean().optional(),
  applications: z.boolean().optional(),
  billing: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    login: user.emailNotifyLogin,
    applications: user.emailNotifyApplications,
    billing: user.emailNotifyBilling,
  });
}

export async function PATCH(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const updated = await db.user.update({
      where: { id: user.id },
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
