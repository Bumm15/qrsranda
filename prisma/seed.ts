/**
 * prisma/seed.ts
 *
 * Creates a demo user + realistic mock data for local development.
 *
 * Run:  npx prisma db seed
 *
 * Login credentials after seeding:
 *   Email:    demo@smartqr.dev
 *   Password: demo1234
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

const db = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const COUNTRIES = ["CZ", "SK", "DE", "US", "GB", "PL", "AT", "FR", "NL", "IT"];
const DEVICES   = ["mobile", "desktop", "tablet"];
const BROWSERS  = ["Chrome", "Safari", "Firefox", "Edge"];
const DEVICE_W  = [0.60, 0.35, 0.05]; // weights: mobile, desktop, tablet

function weightedPick(items: string[], weights: number[]): string {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    cum += weights[i];
    if (r < cum) return items[i];
  }
  return items[items.length - 1];
}

/** Generate `count` scan records spread across the last `days` days */
function makeScans(qrCodeId: string, count: number, days: number) {
  return Array.from({ length: count }, () => {
    const scannedAt = new Date(
      Date.now() - Math.random() * days * 24 * 60 * 60 * 1000
    );
    return {
      qrCodeId,
      scannedAt,
      country: pick(COUNTRIES),
      device:  weightedPick(DEVICES, DEVICE_W),
      browser: pick(BROWSERS),
      ipHash:  nanoid(32),   // fake hash
    };
  });
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding database…");

  // ── 1. Demo user ───────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("demo1234", 12);

  const user = await db.user.upsert({
    where: { email: "demo@smartqr.dev" },
    update: {},
    create: {
      name:     "Demo User",
      email:    "demo@smartqr.dev",
      password: passwordHash,
      role:     "PAID",          // unlocks Smart QR + analytics in the UI
    },
  });

  console.log(`  ✓ User: ${user.email}  (role: ${user.role})`);

  // ── 2. Mock subscription (Stripe placeholder — real keys not needed) ───────
  await db.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId:              user.id,
      stripeCustomerId:     "cus_mock_demo",
      stripeSubscriptionId: "sub_mock_demo",
      status:              "ACTIVE",
      slotsUsed:           3,
      currentPeriodStart:  daysAgo(10),
      currentPeriodEnd:    new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("  ✓ Subscription (mock, ACTIVE)");

  // ── 3. Static URL QR  (goes through /r/ for analytics) ────────────────────
  const staticUrlCode = nanoid(8);
  const staticUrl = await db.qRCode.create({
    data: {
      userId:          user.id,
      type:            "STATIC",
      qrSubtype:       "URL",
      name:            "Homepage Link",
      targetUrl:       "https://smartqr.dev",
      shortCode:       staticUrlCode,
      foregroundColor: "#1e1b4b",
      backgroundColor: "#ffffff",
      createdAt:       daysAgo(28),
    },
  });
  await db.scan.createMany({ data: makeScans(staticUrl.id, 142, 28) });
  console.log(`  ✓ Static URL QR  (shortCode: ${staticUrlCode}, 142 scans)`);

  // ── 4. Static WiFi QR (no shortCode — raw content) ────────────────────────
  const wifiQr = await db.qRCode.create({
    data: {
      userId:          user.id,
      type:            "STATIC",
      qrSubtype:       "WIFI",
      name:            "Office WiFi",
      wifiSsid:        "SmartOffice_5G",
      wifiPassword:    "SecurePass2024!",
      wifiEncryption:  "WPA",
      foregroundColor: "#0f172a",
      backgroundColor: "#f8fafc",
      createdAt:       daysAgo(20),
    },
  });
  console.log(`  ✓ Static WiFi QR  (SSID: SmartOffice_5G)`);

  // ── 5. Static vCard QR ────────────────────────────────────────────────────
  const vcardQr = await db.qRCode.create({
    data: {
      userId:    user.id,
      type:      "STATIC",
      qrSubtype: "VCARD",
      name:      "Jan Novák – Business Card",
      vcardData: JSON.stringify({
        firstName:    "Jan",
        lastName:     "Novák",
        organization: "Smart QR s.r.o.",
        title:        "CEO",
        email:        "jan@smartqr.dev",
        phone:        "+420 777 123 456",
        website:      "https://smartqr.dev",
      }),
      foregroundColor: "#064e3b",
      backgroundColor: "#ecfdf5",
      createdAt:       daysAgo(15),
    },
  });
  console.log(`  ✓ Static vCard QR  (Jan Novák)`);

  // ── 6. Smart QR — product launch promo ────────────────────────────────────
  const smartCode1 = nanoid(8);
  const smartQr1 = await db.qRCode.create({
    data: {
      userId:          user.id,
      type:            "SMART",
      qrSubtype:       "URL",
      name:            "Product Launch",
      targetUrl:       "https://smartqr.dev/launch-v2",
      shortCode:       smartCode1,
      foregroundColor: "#4f46e5",
      backgroundColor: "#eef2ff",
      createdAt:       daysAgo(25),
    },
  });
  // History: started pointing somewhere else, then updated twice
  await db.smartQRHistory.createMany({
    data: [
      { qrCodeId: smartQr1.id, targetUrl: "https://smartqr.dev/coming-soon", changedAt: daysAgo(25) },
      { qrCodeId: smartQr1.id, targetUrl: "https://smartqr.dev/launch-v1",   changedAt: daysAgo(14) },
      { qrCodeId: smartQr1.id, targetUrl: "https://smartqr.dev/launch-v2",   changedAt: daysAgo(3)  },
    ],
  });
  await db.scan.createMany({ data: makeScans(smartQr1.id, 318, 25) });
  console.log(`  ✓ Smart QR #1  (shortCode: ${smartCode1}, 318 scans, 3 history entries)`);

  // ── 7. Smart QR — restaurant menu ─────────────────────────────────────────
  const smartCode2 = nanoid(8);
  const smartQr2 = await db.qRCode.create({
    data: {
      userId:          user.id,
      type:            "SMART",
      qrSubtype:       "URL",
      name:            "Restaurant Menu",
      targetUrl:       "https://bistro-novak.cz/menu-summer",
      shortCode:       smartCode2,
      foregroundColor: "#92400e",
      backgroundColor: "#fffbeb",
      createdAt:       daysAgo(18),
    },
  });
  await db.smartQRHistory.createMany({
    data: [
      { qrCodeId: smartQr2.id, targetUrl: "https://bistro-novak.cz/menu-spring", changedAt: daysAgo(18) },
      { qrCodeId: smartQr2.id, targetUrl: "https://bistro-novak.cz/menu-summer", changedAt: daysAgo(7) },
    ],
  });
  await db.scan.createMany({ data: makeScans(smartQr2.id, 87, 18) });
  console.log(`  ✓ Smart QR #2  (shortCode: ${smartCode2}, 87 scans, restaurant menu)`);

  // ── 8. Smart QR — event with A/B test ─────────────────────────────────────
  const smartCode3 = nanoid(8);
  const smartQr3 = await db.qRCode.create({
    data: {
      userId:          user.id,
      type:            "SMART",
      qrSubtype:       "URL",
      name:            "Event Registration",
      targetUrl:       "https://event.smartqr.dev/register-a",
      shortCode:       smartCode3,
      foregroundColor: "#be185d",
      backgroundColor: "#fdf2f8",
      createdAt:       daysAgo(10),
    },
  });
  await db.smartQRHistory.create({
    data: {
      qrCodeId:  smartQr3.id,
      targetUrl: "https://event.smartqr.dev/register-a",
      changedAt: daysAgo(10),
    },
  });
  // Active A/B test on this QR
  await db.aBTest.create({
    data: {
      qrCodeId:     smartQr3.id,
      variantAUrl:  "https://event.smartqr.dev/register-a",
      variantBUrl:  "https://event.smartqr.dev/register-b",
      splitPercent: 50,
      scanCountA:   41,
      scanCountB:   38,
      active:       true,
    },
  });
  await db.scan.createMany({ data: makeScans(smartQr3.id, 79, 10) });
  console.log(`  ✓ Smart QR #3  (shortCode: ${smartCode3}, 79 scans, A/B test active)`);

  // ── Summary ────────────────────────────────────────────────────────────────
  const totalScans = 142 + 87 + 318 + 79;
  console.log(`\n✅  Seed complete — ${totalScans} scans across 6 QR codes`);
  console.log(`\n   🔑  Login at /login`);
  console.log(`       Email:    demo@smartqr.dev`);
  console.log(`       Password: demo1234\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
