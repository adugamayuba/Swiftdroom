import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseName } from "@/lib/utils";
import {
  uploadResume,
  extractTextFromBuffer,
  isFirebaseConfigured,
} from "@/lib/firebase";

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(buffer, file.name);

    let resumeUrl = "";
    if (isFirebaseConfigured()) {
      resumeUrl = await uploadResume(
        user.id,
        file.name,
        buffer,
        file.type || "application/octet-stream"
      );
    }

    const { firstName, lastName } = parseName(user.name || "");
    await db.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email: user.email,
        fullName: user.name || "",
        firstName,
        lastName,
        resumeText: text,
        resumeFileName: file.name,
        resumeUrl,
      },
      update: {
        resumeText: text,
        resumeFileName: file.name,
        resumeUrl,
      },
    });

    return NextResponse.json({
      resumeText: text,
      resumeFileName: file.name,
      resumeUrl,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
