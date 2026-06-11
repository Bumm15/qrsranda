import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { nanoid } from "nanoid";
import {
  generateQRDataURL,
  buildWifiQRContent,
  buildVCardQRContent,
} from "@/lib/qr";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UrlPayload {
  subtype: "URL";
  url: string;
  foregroundColor?: string;
  backgroundColor?: string;
}

interface WifiPayload {
  subtype: "WIFI";
  ssid: string;
  password: string;
  encryption?: "WPA" | "WEP" | "nopass";
  foregroundColor?: string;
  backgroundColor?: string;
}

interface VCardPayload {
  subtype: "VCARD";
  firstName: string;
  lastName: string;
  organization?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  foregroundColor?: string;
  backgroundColor?: string;
}

type GeneratePayload = UrlPayload | WifiPayload | VCardPayload;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function sanitizeColor(value: unknown, fallback: string): string {
  return isValidColor(value) ? value : fallback;
}

function buildQRContent(payload: GeneratePayload): string {
  switch (payload.subtype) {
    case "URL": {
      // Validate URL to prevent SSRF-style QR content abuse
      const parsed = new URL(payload.url); // throws if invalid
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Only http/https URLs are allowed");
      }
      return payload.url;
    }
    case "WIFI":
      return buildWifiQRContent(
        payload.ssid,
        payload.password,
        payload.encryption ?? "WPA"
      );
    case "VCARD":
      return buildVCardQRContent({
        firstName: payload.firstName,
        lastName: payload.lastName,
        organization: payload.organization,
        title: payload.title,
        email: payload.email,
        phone: payload.phone,
        website: payload.website,
        address: payload.address,
      });
  }
}

// ---------------------------------------------------------------------------
// POST /api/qr/generate
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
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
  const subtype = payload.subtype;

  if (subtype !== "URL" && subtype !== "WIFI" && subtype !== "VCARD") {
    return NextResponse.json(
      { error: "subtype must be one of: URL, WIFI, VCARD" },
      { status: 400 }
    );
  }

  // Subtype-specific validation
  if (subtype === "URL") {
    if (!payload.url || typeof payload.url !== "string") {
      return NextResponse.json({ error: "url is required for URL subtype" }, { status: 400 });
    }
  } else if (subtype === "WIFI") {
    if (!payload.ssid || typeof payload.ssid !== "string") {
      return NextResponse.json({ error: "ssid is required for WIFI subtype" }, { status: 400 });
    }
    if (typeof payload.password !== "string") {
      return NextResponse.json({ error: "password is required for WIFI subtype" }, { status: 400 });
    }
  } else if (subtype === "VCARD") {
    if (!payload.firstName || typeof payload.firstName !== "string") {
      return NextResponse.json({ error: "firstName is required for VCARD subtype" }, { status: 400 });
    }
    if (!payload.lastName || typeof payload.lastName !== "string") {
      return NextResponse.json({ error: "lastName is required for VCARD subtype" }, { status: 400 });
    }
  }

  const foregroundColor = sanitizeColor(payload.foregroundColor, "#000000");
  const backgroundColor = sanitizeColor(payload.backgroundColor, "#ffffff");

  // Optional name
  const name =
    typeof payload.name === "string" && payload.name.trim()
      ? payload.name.trim().slice(0, 100)
      : null;

  // logoUrl must be a relative /uploads/ path (set by /api/upload)
  const rawLogoUrl = payload.logoUrl;
  const logoUrl =
    typeof rawLogoUrl === "string" && /^\/uploads\/[\w-]+\.[a-z]+$/.test(rawLogoUrl)
      ? rawLogoUrl
      : null;

  // Build QR content string
  let qrContent: string;
  try {
    qrContent = buildQRContent(payload as unknown as GeneratePayload);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // Generate QR image
  let dataUrl: string;
  try {
    dataUrl = await generateQRDataURL(qrContent, { foregroundColor, backgroundColor });
  } catch {
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }

  // Persist to DB if the user is authenticated
  const session = await auth();
  let qrId: string | null = null;

  if (session?.user?.id) {
    // For URL subtype: assign a shortCode so the scan goes through /r/[code]
    // This gives us analytics on static URL QRs. WiFi/vCard encode raw content
    // and cannot be proxied through a redirect (phones parse them natively).
    let shortCode: string | null = null;
    let finalQrContent = qrContent; // what actually gets encoded in the image

    if (subtype === "URL") {
      const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
      // Generate a unique short code (retry on collision)
      for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = nanoid(8);
        const existing = await db.qRCode.findUnique({ where: { shortCode: candidate } });
        if (!existing) { shortCode = candidate; break; }
      }
      if (shortCode) {
        finalQrContent = `${appUrl}/r/${shortCode}`;
        // Re-generate the QR image encoding the tracking URL instead
        try {
          dataUrl = await generateQRDataURL(finalQrContent, { foregroundColor, backgroundColor });
        } catch {
          // Non-fatal — fall back to direct URL image
          shortCode = null;
          finalQrContent = qrContent;
        }
      }
    }

    try {
      const record = await db.qRCode.create({
        data: {
          userId: session.user.id,
          type: "STATIC",
          qrSubtype: subtype,
          name,
          targetUrl: subtype === "URL" ? (payload.url as string) : null,
          shortCode,
          wifiSsid: subtype === "WIFI" ? (payload.ssid as string) : null,
          wifiPassword: subtype === "WIFI" ? (payload.password as string) : null,
          wifiEncryption:
            subtype === "WIFI"
              ? ((payload.encryption as string | undefined) ?? "WPA")
              : null,
          vcardData:
            subtype === "VCARD"
              ? JSON.stringify({
                  firstName: payload.firstName,
                  lastName: payload.lastName,
                  organization: payload.organization,
                  title: payload.title,
                  email: payload.email,
                  phone: payload.phone,
                  website: payload.website,
                  address: payload.address,
                })
              : null,
          foregroundColor,
          backgroundColor,
          logoUrl,
        },
      });
      qrId = record.id;
    } catch {
      // Non-fatal — still return the generated QR even if DB write fails
    }
  }

  return NextResponse.json({
    dataUrl,
    subtype,
    ...(qrId ? { id: qrId } : {}),
  });
}
