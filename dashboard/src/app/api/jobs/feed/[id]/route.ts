import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { setActiveJob } from "@/lib/job-feed";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";

const patchSchema = z.object({
  status: z.enum(["saved", "dismissed", "clicked", "active"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { status } = patchSchema.parse(body);

    const existing = await db.jobFeedItem.findFirst({
      where: { id, userId: gate.user.id },
      include: { jobListing: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (status === "active") {
      const item = await setActiveJob(gate.user.id, id);
      return NextResponse.json({
        ok: true,
        applyUrl: item?.jobListing.applyUrl,
        activeJob: item
          ? {
              company: item.jobListing.company,
              title: item.jobListing.title,
              url: item.jobListing.applyUrl,
            }
          : null,
      });
    }

    await db.jobFeedItem.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
    }
    return NextResponse.json(
      { error: friendlyUserMessage("Update failed") },
      { status: 500 }
    );
  }
}
