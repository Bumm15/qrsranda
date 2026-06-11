import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateQRDataURL } from "@/lib/qr";

// ---------------------------------------------------------------------------
// GET /api/qr/[id]  — fetch a single QR with its Smart history
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const qr = await db.qRCode.findUnique({
    where: { id },
    include: {
      history: { orderBy: { changedAt: "desc" } },
      abTest: true,
      _count: { select: { scans: true } },
    },
  });

  if (!qr) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership check — admins can bypass
  if (qr.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(qr);
}

// ---------------------------------------------------------------------------
// PATCH /api/qr/[id]  — update a Smart QR's targetUrl (writes history entry)
// ---------------------------------------------------------------------------
// Body: { targetUrl: string }
// Optional: { foregroundColor?, backgroundColor?, logoUrl? }

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.qRCode.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Ownership check
  if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body first (shared by both STATIC and SMART paths)
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Body must be a JSON object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  if (existing.type !== "SMART") {
    // Static QRs: only name editable via PATCH
    const name =
      typeof payload.name === "string"
        ? payload.name.trim().slice(0, 100) || null
        : existing.name;
    const updated = await db.qRCode.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json(updated);
  }

  // Validate new targetUrl
  if (!payload.targetUrl || typeof payload.targetUrl !== "string") {
    return NextResponse.json({ error: "targetUrl is required" }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(payload.targetUrl);
  } catch {
    return NextResponse.json({ error: "targetUrl is not a valid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: "Only http/https URLs are allowed" }, { status: 400 });
  }

  const newTargetUrl = payload.targetUrl as string;

  // Optional name update (keep existing if not provided)
  const name =
    typeof payload.name === "string"
      ? payload.name.trim().slice(0, 100) || null
      : existing.name;
  const foregroundColor =
    typeof payload.foregroundColor === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(payload.foregroundColor)
      ? payload.foregroundColor
      : existing.foregroundColor;

  const backgroundColor =
    typeof payload.backgroundColor === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(payload.backgroundColor)
      ? payload.backgroundColor
      : existing.backgroundColor;

  const rawLogoUrl = payload.logoUrl;
  const logoUrl =
    typeof rawLogoUrl === "string" && /^\/uploads\/[\w-]+\.[a-z]+$/.test(rawLogoUrl)
      ? rawLogoUrl
      : existing.logoUrl;

  // Write history + update QR atomically
  const [, updated] = await db.$transaction([
    db.smartQRHistory.create({
      data: {
        qrCodeId: id,
        targetUrl: newTargetUrl,
      },
    }),
    db.qRCode.update({
      where: { id },
      data: {
        targetUrl: newTargetUrl,
        name,
        foregroundColor,
        backgroundColor,
        logoUrl,
      },
    }),
  ]);

  // Re-generate the QR image (still encodes the /r/<shortCode> redirect URL)
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUrl = `${appUrl}/r/${existing.shortCode}`;

  let dataUrl: string | null = null;
  try {
    dataUrl = await generateQRDataURL(redirectUrl, { foregroundColor, backgroundColor });
  } catch {
    // Non-fatal — client can re-render from the QRCodeCanvas widget
  }

  return NextResponse.json({ ...updated, dataUrl });
}

// ---------------------------------------------------------------------------
// DELETE /api/qr/[id]  — delete a QR code (cascades history + scans)
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

  const existing = await db.qRCode.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (existing.userId !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.qRCode.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
