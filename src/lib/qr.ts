import QRCode from "qrcode";
import crypto from "crypto";

export interface QROptions {
  foregroundColor?: string;
  backgroundColor?: string;
  width?: number;
  margin?: number;
}

/**
 * Generate a QR code as a base64 PNG data URL.
 * Used server-side (API routes) or in server components.
 */
export async function generateQRDataURL(
  content: string,
  options: QROptions = {}
): Promise<string> {
  const {
    foregroundColor = "#000000",
    backgroundColor = "#ffffff",
    width = 400,
    margin = 2,
  } = options;

  return QRCode.toDataURL(content, {
    color: {
      dark: foregroundColor,
      light: backgroundColor,
    },
    width,
    margin,
    errorCorrectionLevel: "H", // High — allows logo overlay
  });
}

/**
 * Generate QR as raw Buffer (PNG) for file saving / S3 upload.
 */
export async function generateQRBuffer(
  content: string,
  options: QROptions = {}
): Promise<Buffer> {
  const {
    foregroundColor = "#000000",
    backgroundColor = "#ffffff",
    width = 400,
    margin = 2,
  } = options;

  return QRCode.toBuffer(content, {
    color: {
      dark: foregroundColor,
      light: backgroundColor,
    },
    width,
    margin,
    errorCorrectionLevel: "H",
  });
}

/**
 * Build the content string for a WiFi QR code (WPA/WPA2/WEP).
 */
export function buildWifiQRContent(
  ssid: string,
  password: string,
  encryption: "WPA" | "WEP" | "nopass" = "WPA"
): string {
  const escaped = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
  return `WIFI:T:${encryption};S:${escaped(ssid)};P:${escaped(password)};;`;
}

/**
 * Build the content string for a vCard QR code (vCard 3.0).
 */
export function buildVCardQRContent(data: {
  firstName: string;
  lastName: string;
  organization?: string;
  title?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
}): string {
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${data.lastName};${data.firstName};;;`,
    `FN:${data.firstName} ${data.lastName}`,
  ];
  if (data.organization) lines.push(`ORG:${data.organization}`);
  if (data.title) lines.push(`TITLE:${data.title}`);
  if (data.email) lines.push(`EMAIL:${data.email}`);
  if (data.phone) lines.push(`TEL:${data.phone}`);
  if (data.website) lines.push(`URL:${data.website}`);
  if (data.address) lines.push(`ADR:;;${data.address};;;;`);
  lines.push("END:VCARD");
  return lines.join("\n");
}

/**
 * Hash an IP address with a daily salt for GDPR-compliant storage.
 * Raw IP is never stored.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT ?? "default-salt";
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return crypto.createHash("sha256").update(`${ip}:${salt}:${day}`).digest("hex");
}

/**
 * A/B routing: deterministic bucket assignment based on ipHash.
 * Returns "A" or "B" based on the splitPercent threshold.
 */
export function getABVariant(
  ipHash: string,
  splitPercent: number
): "A" | "B" {
  // Take first 8 hex chars → number 0-4294967295, normalise to 0-99
  const num = parseInt(ipHash.slice(0, 8), 16);
  const bucket = num % 100;
  return bucket < splitPercent ? "A" : "B";
}
