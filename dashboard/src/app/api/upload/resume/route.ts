import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseName } from "@/lib/utils";
import { uploadResume, isFirebaseConfigured } from "@/lib/firebase";
import { extractTextFromBuffer } from "@/lib/pdf-extract";
import { extractContactFromResume } from "@/lib/resume-parser";
import { USER_MESSAGES, friendlyUserMessage } from "@/lib/user-messages";

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json(
      { error: friendlyUserMessage("Unauthorized") },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json(
        { error: friendlyUserMessage("No file provided") },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(buffer, file.name);

    if (!text.trim()) {
      return NextResponse.json(
        { error: USER_MESSAGES.resumeScanned },
        { status: 422 }
      );
    }

    // Extract contact details from resume text
    const extracted = extractContactFromResume(text);

    let resumeUrl = "";
    if (isFirebaseConfigured()) {
      resumeUrl = await uploadResume(
        user.id,
        file.name,
        buffer,
        file.type || "application/octet-stream"
      );
    }

    // Seed the profile with extracted data — don't overwrite fields already set by user
    const existing = user.profile;
    const fullName = existing?.fullName || extracted.fullName || user.name || "";
    const { firstName, lastName } = parseName(fullName);

    await db.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        email: existing?.email || extracted.email || user.email,
        fullName,
        firstName,
        lastName,
        phone: existing?.phone || extracted.phone || "",
        location: existing?.location || extracted.location || "",
        linkedinUrl: existing?.linkedinUrl || extracted.linkedinUrl || "",
        githubUrl: existing?.githubUrl || extracted.githubUrl || "",
        portfolioUrl: existing?.portfolioUrl || extracted.portfolioUrl || "",
        resumeText: text,
        resumeFileName: file.name,
        resumeUrl,
      },
      update: {
        resumeText: text,
        resumeFileName: file.name,
        resumeUrl,
        // Only update contact fields if they were empty before
        ...((!existing?.fullName && extracted.fullName) ? { fullName: extracted.fullName, firstName, lastName } : {}),
        ...((!existing?.email && extracted.email) ? { email: extracted.email } : {}),
        ...((!existing?.phone && extracted.phone) ? { phone: extracted.phone } : {}),
        ...((!existing?.location && extracted.location) ? { location: extracted.location } : {}),
        ...((!existing?.linkedinUrl && extracted.linkedinUrl) ? { linkedinUrl: extracted.linkedinUrl } : {}),
        ...((!existing?.githubUrl && extracted.githubUrl) ? { githubUrl: extracted.githubUrl } : {}),
        ...((!existing?.portfolioUrl && extracted.portfolioUrl) ? { portfolioUrl: extracted.portfolioUrl } : {}),
      },
    });

    const { syncDefaultPersonaFromProfile } = await import("@/lib/persona-sync");
    await syncDefaultPersonaFromProfile(user.id);

    return NextResponse.json({
      resumeText: text,
      resumeFileName: file.name,
      resumeUrl,
      extracted,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: friendlyUserMessage("Upload failed") },
      { status: 500 }
    );
  }
}
