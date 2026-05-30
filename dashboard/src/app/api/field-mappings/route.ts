import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getUserFromApiToken } from "@/lib/auth";

const mappingSchema = z.object({
  domain: z.string(),
  labelPattern: z.string(),
  fieldKey: z.string(),
});

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserFromApiToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserFromApiToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const mappings = await db.fieldMapping.findMany({
    where: { userId: user.id },
  });

  return NextResponse.json({ mappings });
}
