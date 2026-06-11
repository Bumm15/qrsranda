# Smart QR — Product Roadmap

> **Stack:** Next.js 14 (App Router) · Prisma · SQLite (dev) / MySQL (prod) · NextAuth.js v5 · Lemon Squeezy · Tailwind CSS

---

## Roles & Feature Matrix

| Feature | Anon | Free (registered) | Paid |
|---|:---:|:---:|:---:|
| Static QR (URL / WiFi / vCard) | ✅ | ✅ | ✅ |
| QR history & management | ❌ | ✅ | ✅ |
| Basic analytics (scan count) | ❌ | ✅ | ✅ |
| Smart QR (editable redirect) | ❌ | ❌ | ✅ |
| Smart QR history + revert | ❌ | ❌ | ✅ |
| Full analytics (country / device / time) | ❌ | ❌ | ✅ |
| A/B testing | ❌ | ❌ | ✅ |
| Logo + colour customisation | ❌ | ❌ | ✅ |
| One-page website builder | ❌ | ❌ | ✅ |

**Billing:** 50 CZK ≈ $2.20 / active Smart QR slot / month (Lemon Squeezy — global payments, VAT handled automatically)

---

## Database Schema (Prisma)

```
User            ←── Account / Session / VerificationToken (NextAuth)
  │
  ├── QRCode          type: STATIC | SMART
  │     ├── SmartQRHistory   (targetUrl, changedAt → revert)
  │     ├── Scan             (ipHash SHA-256, country, device, browser, os, scannedAt)
  │     └── ABTest           (variantA/B URL, splitPercent Int, scanCountA/B)
  │
  ├── Subscription    (lsCustomerId, lsSubscriptionId, lsVariantId, status, slotsUsed)
  │     └── SubscriptionItem (lsOrderId, lsProductId — Lemon Squeezy order reference)
  │
  └── OnepageWebsite  (slug unique, template, content JSON, published)
```

---

## Milestones

### Phase 1 — Foundation
| # | Task | Output | Status |
|---|------|--------|--------|
| 1 | `create-next-app` + Tailwind + ESLint + path aliases `@/*` | Dev server running | ✅ |
| 2 | Prisma init + MySQL schema + `prisma migrate dev` | All tables in DB | ✅ schema ✓ — run `migration` once DB is ready |
| 3 | NextAuth.js v5 — Google OAuth + Email/Password credentials, Prisma adapter | Login/logout | ✅ |
| 4 | `.env.example`, middleware skeleton (route protection) | Security baseline | ✅ |

### Phase 2 — QR Core
| # | Task | Output | Status |
|---|------|--------|--------|
| 5 | `POST /api/qr/generate` — Static QR (URL / WiFi / vCard), anon or user | API working | ✅ |
| 6 | `qrcode.react` widget, colour picker, logo upload (`/api/upload`) | QR with logo | ✅ |
| 7 | Smart QR create/edit: `shortCode`, write `SmartQRHistory` on each update | Editable QR | ✅ |
| 8 | Redirect endpoint `app/r/[code]/route.ts`: lookup → write `Scan` → 302 (A/B logic) | Tracking live | ✅ |

### Phase 3 — Dashboard
| # | Task | Output | Status |
|---|------|--------|--------|
| 9 | Layout: sidebar nav, auth guard, user menu | Dashboard shell | ✅ |
| 10 | QR list page: table with type badge, scan count, edit / delete / download PNG | QR management | ✅ |
| 11 | QR detail/edit: form, history timeline with **Revert** button | Smart QR UX | ✅ |
| 12 | Analytics page: scan chart (recharts), country table, device breakdown | Data visualisation | ✅ |

### Phase 4 — Lemon Squeezy Integration
| # | Task | Output | Status |
|---|------|--------|--------|
| 13 | Lemon Squeezy store setup — product + variant per slot tier, `src/lib/lemonsqueezy.ts` | LS config | ⬜ |
| 14 | `POST /api/payments/checkout` — creates Lemon Squeezy Checkout URL and redirects | Payment flow | ⬜ |
| 15 | `POST /api/payments/webhook` — handles `subscription_created`, `subscription_updated`, `subscription_cancelled` events, updates `Subscription` in DB | Billing sync | ⬜ |
| 16 | Billing portal page (link to LS customer portal), `withPaidFeature()` HOC / middleware | Feature gating | ⬜ |

### Phase 4b — Smart QR Creation Flow
| # | Task | Output | Status |
|---|------|--------|--------|
| 4b-1 | Smart QR creation wizard: step 1 — choose type (URL / vCard / WiFi / One-page), step 2 — fill content, step 3 — customise (colour / logo) | Multi-step form | ⬜ |
| 4b-2 | `shortCode` generation (8-char nanoid), `POST /api/qr/smart` — creates `QRCode` with `type: SMART`, initial `SmartQRHistory` entry | Smart QR in DB | ✅ |
| 4b-3 | QR preview panel on creation page — live SVG refresh on each form change | Real-time preview | ⬜ |
| 4b-4 | "Activate" gate: if user has no active subscription → redirect to checkout; if paid → activate slot and show success | Subscription gate | ⬜ |
| 4b-5 | Smart QR edit page (`/dashboard/qr/[id]`): change target URL, view full change history timeline with **Revert** button | Editable QR UX | ✅ |
| 4b-6 | Redirect endpoint `app/r/[code]/route.ts` — lookup Smart QR → write `Scan` row → 302 to target (A/B logic included) | Live tracking | ✅ |

### Phase 5 — Premium & One-page Builder
| # | Task | Output | Status |
|---|------|--------|--------|
| 17 | A/B test UI: create test on Smart QR, view split stats | A/B feature | ✅ |
| 18 | One-page builder: template picker (VCARD / CAR / LINK), JSON editor, live preview | Builder UI | ⬜ |
| 19 | `app/p/[slug]/page.tsx` — public renderer for one-page sites | Hosted web | ⬜ |

### Phase 6 — Legal side of things
| # | Task | Output | Status |
|---|------|--------|--------|
| 20 | Temrs of use, SEO optimalization, cookies, privacy stuff | ⬜ |
| 21 | Big SEO optimalization | ⬜ |


### Phase 7 — Polish & Deploy
| # | Task | Output | Status |
|---|------|--------|--------|
| 22 | Landing page: hero, pricing table (50 CZK/slot), FAQ | Marketing | ⬜ |
| 23 | Transactional email via Resend: welcome, billing receipt | Notifications | ⬜ |
| 24 | Vercel deploy + PlanetScale/Railway MySQL, env vars documented | Production | ⬜ |


---

## Project Structure (target)

```
smart-qr/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (marketing)/
│   │   └── page.tsx                 # Landing page
│   ├── dashboard/
│   │   ├── layout.tsx               # Sidebar + auth guard
│   │   ├── page.tsx                 # Overview
│   │   ├── qr/
│   │   │   ├── page.tsx             # QR list
│   │   │   ├── new/page.tsx         # Create QR
│   │   │   └── [id]/page.tsx        # Edit / Analytics
│   │   ├── analytics/page.tsx
│   │   ├── builder/page.tsx         # One-page builder
│   │   └── billing/page.tsx
│   ├── r/[code]/
│   │   └── route.ts                 # Smart QR redirect + tracking
│   ├── p/[slug]/
│   │   └── page.tsx                 # Public one-page renderer
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── qr/
│       │   ├── generate/route.ts
│       │   └── [id]/route.ts
│       ├── upload/route.ts
│       └── payments/
│           ├── checkout/route.ts
│           └── webhook/route.ts
├── src/
│   ├── lib/
│   │   ├── db.ts                    # Prisma singleton
│   │   ├── auth.ts                  # NextAuth config
│   │   ├── lemonsqueezy.ts          # Lemon Squeezy client
│   │   └── qr.ts                    # QR generation helpers
│   ├── components/
│   │   ├── ui/                      # shadcn/ui base components
│   │   ├── qr/                      # QR-specific components
│   │   └── dashboard/               # Dashboard layout components
│   └── middleware.ts
├── prisma/
│   └── schema.prisma
├── .env.example
└── ROADMAP.md
```

---

## Architecture Notes

- **Short codes** for Smart QR: 8-char nanoid, e.g. `/r/aB3xK9mZ`
- **Scan tracking:** IP is hashed (SHA-256 + salt) immediately — raw IP never stored (GDPR)
- **A/B routing:** deterministic with `nanoid` seeded hash on `ipHash` for consistent UX
- **Billing:** Lemon Squeezy handles VAT/tax for all countries automatically — no need for manual tax configuration; subscription events synced via signed webhooks (`X-Signature` header verified with HMAC-SHA256)
- **Logo upload:** stored in `/public/uploads/[userId]/` locally in dev, S3/R2 bucket in production
- **Feature gating:** `getServerSession()` + `user.role` check server-side; `<PaidFeatureGate>` wrapper client-side
