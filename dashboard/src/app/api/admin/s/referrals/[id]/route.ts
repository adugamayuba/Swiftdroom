import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";

const updateSchema = z.object({
  status: z.enum(["PAID", "CANCELED"]).optional(),
  paidNote: z.string().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const earning = await db.referralEarning.findUnique({ where: { id } });
    if (!earning) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await db.referralEarning.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.paidNote !== undefined ? { paidNote: data.paidNote } : {}),
        ...(data.status === "PAID" ? { paidAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ earning: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
