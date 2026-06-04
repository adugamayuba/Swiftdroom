import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadResume, isFirebaseConfigured } from "@/lib/firebase";
import { extractTextFromBuffer } from "@/lib/pdf-extract";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const persona = await db.persona.findFirst({ where: { id, userId: user.id } });
  if (!persona) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromBuffer(buffer, file.name);

    if (!text.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from this file. Try a text-based PDF or paste resume text." },
        { status: 422 }
      );
    }

    let resumeUrl = persona.resumeUrl;
    if (isFirebaseConfigured()) {
      resumeUrl = await uploadResume(
        `${user.id}/personas/${persona.id}`,
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
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
