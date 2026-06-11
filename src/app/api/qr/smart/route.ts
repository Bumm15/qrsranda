import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateQRDataURL } from "@/lib/qr";
import { nanoid } from "nanoid";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidColor(v: unknown): v is string {
  return typeof v === "string" && /^#[0-9A-Fa-f]{6}$/.test(v);
}

function sanitizeColor(v: unknown, fallback: string): string {
  return isValidColor(v) ? v : fallback;
}

/** Generate a unique 8-char short code, retrying on collision (extremely rare). */
async function uniqueShortCode(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = nanoid(8);
    const existing = await db.qRCode.findUnique({ where: { shortCode: code } });
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique short code — please retry");
}

// ---------------------------------------------------------------------------
// POST /api/qr/smart  — create a new Smart QR
// ---------------------------------------------------------------------------
// Requires: authenticated session
// Body: { targetUrl: string, foregroundColor?, backgroundColor?, logoUrl? }
// Returns: { id, shortCode, redirectUrl, dataUrl }

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  // Validate targetUrl
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

  const targetUrl = payload.targetUrl as string;
  const name =
    typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim().slice(0, 100)
      : null;
  const foregroundColor = sanitizeColor(payload.foregroundColor, "#000000");
  const backgroundColor = sanitizeColor(payload.backgroundColor, "#ffffff");

  const rawLogoUrl = payload.logoUrl;
  const logoUrl =
    typeof rawLogoUrl === "string" && /^\/uploads\/[\w-]+\.[a-z]+$/.test(rawLogoUrl)
      ? rawLogoUrl
      : null;

  // Generate unique short code
  let shortCode: string;
  try {
    shortCode = await uniqueShortCode();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Short code generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  // The QR image encodes the redirect URL: /r/<shortCode>
  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const redirectUrl = `${appUrl}/r/${shortCode}`;

  let dataUrl: string;
  try {
    dataUrl = await generateQRDataURL(redirectUrl, { foregroundColor, backgroundColor });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR image" }, { status: 500 });
  }

  // Create QRCode + first SmartQRHistory entry atomically
  const record = await db.qRCode.create({
    data: {
      userId: session.user.id,
      type: "SMART",
      qrSubtype: "URL",
      name,
      targetUrl,
      shortCode,
      foregroundColor,
      backgroundColor,
      logoUrl,
      history: {
        create: { targetUrl },
      },
    },
  });

  return NextResponse.json(
    { id: record.id, shortCode, redirectUrl, dataUrl },
    { status: 201 }
  );
}
