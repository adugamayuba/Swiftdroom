import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserFromApiToken } from "@/lib/auth";
import {
  hasActiveSubscription,
  syncExpiredSubscription,
} from "@/lib/subscription";
import { apiError, apiZodError } from "@/lib/user-messages";

const mappingSchema = z.object({
  domain: z.string(),
  labelPattern: z.string(),
  fieldKey: z.string(),
});

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return apiError("Unauthorized", 401);
  }

  let user = await getUserFromApiToken(token);
  if (!user) {
    return apiError("Invalid token", 401);
  }

  user = await syncExpiredSubscription(user);
  if (!hasActiveSubscription(user)) {
    return apiError("Active subscription required", 403, {
      code: "SUBSCRIPTION_REQUIRED",
    });
  }

  try {
    const body = await request.json();
    const data = mappingSchema.parse(body);

    const mapping = await db.fieldMapping.upsert({
      where: {
        userId_domain_labelPattern: {
          userId: user.id,
          domain: data.domain,
          labelPattern: data.labelPattern,
        },
      },
      create: { userId: user.id, ...data },
      update: { fieldKey: data.fieldKey },
    });

    return NextResponse.json({ mapping });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiZodError(error);
    }
    return apiError("Save failed", 500);
  }
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return apiError("Unauthorized", 401);
  }

  let user = await getUserFromApiToken(token);
  if (!user) {
    return apiError("Invalid token", 401);
  }

  user = await syncExpiredSubscription(user);
  if (!hasActiveSubscription(user)) {
    return apiError("Active subscription required", 403, {
      code: "SUBSCRIPTION_REQUIRED",
    });
  }

  const mappings = await db.fieldMapping.findMany({
    where: { userId: user.id },
  });

  return NextResponse.json({ mappings });
}
