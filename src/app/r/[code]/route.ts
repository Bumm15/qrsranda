import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashIp, getABVariant } from "@/lib/qr";

// ---------------------------------------------------------------------------
// GET /r/[code]  — Smart QR redirect endpoint
//
// Flow:
//   1. Lookup QRCode by shortCode (must be SMART + have a targetUrl)
//   2. Parse device / browser / OS from User-Agent
//   3. Extract geo headers set by Vercel / Cloudflare edge
//   4. Hash the visitor IP (SHA-256 + daily salt) — raw IP never stored
//   5. If an active ABTest exists → pick variant deterministically, increment counter
//   6. Write a Scan row (fire-and-forget — never blocks the redirect)
//   7. 302 redirect to the resolved target URL
// ---------------------------------------------------------------------------

function parseDevice(ua: string): string {
  if (/tablet|ipad/i.test(ua)) return "tablet";
  if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return "mobile";
  return "desktop";
}

function parseBrowser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\//i.test(ua)) return "Opera";
  if (/chrome\//i.test(ua) && !/chromium/i.test(ua)) return "Chrome";
  if (/firefox\//i.test(ua)) return "Firefox";
  if (/safari\//i.test(ua) && !/chrome/i.test(ua)) return "Safari";
  return "Other";
}

function parseOS(ua: string): string {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/mac os x/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  // 1. Lookup
  const qr = await db.qRCode.findUnique({
    where: { shortCode: code },
    include: { abTest: true },
  });

  if (!qr || !qr.targetUrl) {
    return NextResponse.redirect(new URL("/", req.url), { status: 302 });
  }

  // Both STATIC (URL subtype) and SMART QRs pass through here.
  // WiFi / vCard static QRs never get a shortCode so they won't reach this route.

  // 2. Determine redirect target (plain or A/B)
  const ua = req.headers.get("user-agent") ?? "";

  // Extract IP — Vercel sets x-forwarded-for, Cloudflare sets cf-connecting-ip
  const rawIp =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";

  const ipHash = hashIp(rawIp);

  let destination = qr.targetUrl;
  let abVariant: "A" | "B" | null = null;

  if (qr.abTest?.active) {
    abVariant = getABVariant(ipHash, qr.abTest.splitPercent);
    destination =
      abVariant === "A" ? qr.abTest.variantAUrl : qr.abTest.variantBUrl;
  }

  // 3. Geo headers (Vercel edge / Cloudflare Workers)
  const country =
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry") ??
    null;
  const city =
    req.headers.get("x-vercel-ip-city") ?? null;
  const region =
    req.headers.get("x-vercel-ip-country-region") ?? null;

  // 4. Referrer
  const referrer = req.headers.get("referer") ?? null;

  // 5. Write Scan + update A/B counters — fire and forget, never delays redirect
  db.$transaction(async (tx) => {
    await tx.scan.create({
      data: {
        qrCodeId: qr.id,
        ipHash,
        country,
        city,
        region,
        device: parseDevice(ua),
        browser: parseBrowser(ua),
        os: parseOS(ua),
        referrer,
      },
    });

    if (qr.abTest?.active && abVariant) {
      await tx.aBTest.update({
        where: { id: qr.abTest.id },
        data:
          abVariant === "A"
            ? { scanCountA: { increment: 1 } }
            : { scanCountB: { increment: 1 } },
      });
    }
  }).catch(() => {
    // Swallow DB errors — tracking must never break the redirect
  });

  // 6. 302 redirect
  return NextResponse.redirect(destination, { status: 302 });
}
