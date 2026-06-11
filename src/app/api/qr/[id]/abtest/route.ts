import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// POST /api/qr/[id]/abtest  — create or replace the A/B test for a Smart QR
// Body: { variantBUrl: string, splitPercent?: number (1-99) }
// ---------------------------------------------------------------------------

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const qr = await db.qRCode.findUnique({ where: { id }, include: { abTest: true } });

  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (qr.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (qr.type !== "SMART") {
    return NextResponse.json({ error: "A/B tests only supported on Smart QR codes" }, { status: 400 });
  }
  if (!qr.targetUrl) {
    return NextResponse.json({ error: "Smart QR must have a target URL before creating an A/B test" }, { status: 400 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  if (!payload.variantBUrl || typeof payload.variantBUrl !== "string") {
    return NextResponse.json({ error: "variantBUrl is required" }, { status: 400 });
  }

  let parsedB: URL;
  try { parsedB = new URL(payload.variantBUrl); } catch {
    return NextResponse.json({ error: "variantBUrl is not a valid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsedB.protocol)) {
    return NextResponse.json({ error: "Only http/https URLs allowed" }, { status: 400 });
  }

  const splitPercent =
    typeof payload.splitPercent === "number" &&
    payload.splitPercent >= 1 &&
    payload.splitPercent <= 99
      ? Math.round(payload.splitPercent)
      : 50;

  // Upsert: replace existing test (reset counters) or create new
  const abTest = await db.aBTest.upsert({
    where: { qrCodeId: id },
    update: {
      variantAUrl:  qr.targetUrl,
      variantBUrl:  payload.variantBUrl as string,
      splitPercent,
      scanCountA:   0,
      scanCountB:   0,
      active:       true,
    },
    create: {
      qrCodeId:    id,
      variantAUrl: qr.targetUrl,
      variantBUrl: payload.variantBUrl as string,
      splitPercent,
      active:      true,
    },
  });

  return NextResponse.json(abTest, { status: 200 });
}

// ---------------------------------------------------------------------------
// PATCH /api/qr/[id]/abtest  — toggle active / change split %
// Body: { active?: boolean, splitPercent?: number }
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const qr = await db.qRCode.findUnique({ where: { id }, include: { abTest: true } });

  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (qr.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!qr.abTest) {
    return NextResponse.json({ error: "No A/B test found" }, { status: 404 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  const data: { active?: boolean; splitPercent?: number } = {};

  if (typeof payload.active === "boolean") data.active = payload.active;

  if (
    typeof payload.splitPercent === "number" &&
    payload.splitPercent >= 1 &&
    payload.splitPercent <= 99
  ) {
    data.splitPercent = Math.round(payload.splitPercent);
  }

  const updated = await db.aBTest.update({
    where: { id: qr.abTest.id },
    data,
  });

  return NextResponse.json(updated);
}

// ---------------------------------------------------------------------------
// DELETE /api/qr/[id]/abtest  — delete the A/B test
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const qr = await db.qRCode.findUnique({ where: { id }, include: { abTest: true } });

  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (qr.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!qr.abTest) {
    return NextResponse.json({ error: "No A/B test found" }, { status: 404 });
  }

  await db.aBTest.delete({ where: { id: qr.abTest.id } });

  return new NextResponse(null, { status: 204 });
}
