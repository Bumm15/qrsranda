import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// GET /api/analytics
//
// Returns aggregated scan data for the authenticated user's QR codes.
// Query params:
//   ?days=30   (default 30, max 365)
//   ?qrId=xxx  (optional — filter to a specific QR code)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const days = Math.min(365, Math.max(1, Number(searchParams.get("days") ?? 30)));
  const qrId = searchParams.get("qrId") ?? undefined;

  const userId = session.user.id;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Build the QR code id filter (must be owned by user)
  let qrCodeIds: string[];
  if (qrId) {
    const owned = await db.qRCode.findFirst({ where: { id: qrId, userId }, select: { id: true } });
    if (!owned) {
      return NextResponse.json({ error: "QR not found or not owned by you" }, { status: 404 });
    }
    qrCodeIds = [qrId];
  } else {
    const userQrs = await db.qRCode.findMany({ where: { userId }, select: { id: true } });
    qrCodeIds = userQrs.map((q) => q.id);
  }

  if (qrCodeIds.length === 0) {
    return NextResponse.json({ scansOverTime: [], byCountry: [], byDevice: [], byBrowser: [], total: 0 });
  }

  // All scans within the date range
  const scans = await db.scan.findMany({
    where: {
      qrCodeId: { in: qrCodeIds },
      scannedAt: { gte: since },
    },
    select: {
      scannedAt: true,
      country: true,
      device: true,
      browser: true,
    },
    orderBy: { scannedAt: "asc" },
  });

  // ── Scans over time (group by day) ─────────────────────────────────────
  const dayMap = new Map<string, number>();
  // Pre-fill every day in range with 0
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const scan of scans) {
    const key = scan.scannedAt.toISOString().slice(0, 10);
    dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
  }
  const scansOverTime = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));

  // ── By country ──────────────────────────────────────────────────────────
  const countryMap = new Map<string, number>();
  for (const scan of scans) {
    const key = scan.country ?? "Unknown";
    countryMap.set(key, (countryMap.get(key) ?? 0) + 1);
  }
  const byCountry = Array.from(countryMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── By device ────────────────────────────────────────────────────────────
  const deviceMap = new Map<string, number>();
  for (const scan of scans) {
    const key = scan.device ?? "Unknown";
    deviceMap.set(key, (deviceMap.get(key) ?? 0) + 1);
  }
  const byDevice = Array.from(deviceMap.entries())
    .map(([device, count]) => ({ device, count }))
    .sort((a, b) => b.count - a.count);

  // ── By browser ────────────────────────────────────────────────────────────
  const browserMap = new Map<string, number>();
  for (const scan of scans) {
    const key = scan.browser ?? "Unknown";
    browserMap.set(key, (browserMap.get(key) ?? 0) + 1);
  }
  const byBrowser = Array.from(browserMap.entries())
    .map(([browser, count]) => ({ browser, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return NextResponse.json({
    total: scans.length,
    scansOverTime,
    byCountry,
    byDevice,
    byBrowser,
  });
}
