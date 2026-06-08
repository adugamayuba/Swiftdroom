import { NextRequest, NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { db } from "@/lib/db";
import { uploadResume, isFirebaseConfigured } from "@/lib/firebase";
import { extractTextFromBuffer } from "@/lib/pdf-extract";
import { USER_MESSAGES, friendlyUserMessage } from "@/lib/user-messages";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const { id } = await params;
  const persona = await db.persona.findFirst({
    where: { id, userId: gate.user.id },
  });
  if (!persona) {
    return NextResponse.json(
      { error: friendlyUserMessage("Not found") },
      { status: 404 }
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

    let resumeUrl = persona.resumeUrl;
    if (isFirebaseConfigured()) {
      resumeUrl = await uploadResume(
        `${gate.user.id}/personas/${persona.id}`,
        file.name,
        buffer,
        file.type || "application/octet-stream"
      );
    }

    const updated = await db.persona.update({
      where: { id },
      data: {
        resumeText: text,
        resumeFileName: file.name,
        resumeUrl,
      },
    });

    return NextResponse.json({ persona: updated });
  } catch (error) {
    console.error("Persona resume upload error:", error);
    return NextResponse.json(
      { error: friendlyUserMessage("Upload failed") },
      { status: 500 }
    );
  }
}
