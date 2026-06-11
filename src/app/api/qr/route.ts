import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/qr — list all QR codes for the authenticated user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // optional: STATIC | SMART

  const qrCodes = await db.qRCode.findMany({
    where: {
      userId: session.user.id,
      ...(type === "STATIC" || type === "SMART" ? { type } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { scans: true } },
    },
  });

  return NextResponse.json(qrCodes);
}
