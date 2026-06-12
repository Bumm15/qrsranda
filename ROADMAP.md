# Smart QR — Product Roadmap

> **Stack:** Next.js 14 (App Router) · Prisma · SQLite (dev) / MySQL (prod) · NextAuth.js v5 · Lemon Squeezy · Tailwind CSS

---

## Roles & Feature Matrix

| Feature | Anon | Free | Hobby | Pro |
|---|:---:|:---:|:---:|:---:|
| Static QR on landing page (no account) | ✅ | ✅ | ✅ | ✅ |
| Static QR saved to account (URL / WiFi / vCard / text) | ❌ | ✅ | ✅ | ✅ |
| QR history & management | ❌ | ✅ | ✅ | ✅ |
| Basic analytics (scan count) | ❌ | ✅ | ✅ | ✅ |
| Smart QR slots (editable redirect) | ❌ | ❌ | **5** | **50** |
| Smart QR history + revert | ❌ | ❌ | ✅ | ✅ |
| Full analytics (country / device / time) | ❌ | ❌ | ✅ | ✅ |
| A/B testing | ❌ | ❌ | ✅ | ✅ |
| Logo + colour customisation | ❌ | ❌ | ✅ | ✅ |
| One-page website builder | ❌ | ❌ | ✅ | ✅ |

**Plans (Lemon Squeezy — global payments, VAT handled automatically):**

| Plan | Price | Smart QR slots |
|------|-------|----------------|
| Free | 0 CZK | 0 |
| Hobby | TBD CZK / month | 5 |
| Pro | TBD CZK / month | 50 |

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
  ├── Subscription    (lsCustomerId, lsSubscriptionId, lsVariantId, plan: FREE|HOBBY|PRO, smartQrLimit: 0|5|50, status)
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

> **Billing model changed** from per-slot to flat subscription tiers — any previously drafted LS product config must be rebuilt.

| # | Task | Output | Status |
|---|------|--------|--------|
| 13 | Lemon Squeezy store setup — **2 products**: Hobby (5 Smart QR slots) + Pro (50 Smart QR slots); `src/lib/lemonsqueezy.ts` with variant IDs in `.env` | LS config | ⬜ |
| 14 | `POST /api/payments/checkout` — accepts `plan: 'hobby' \| 'pro'`, creates LS Checkout URL and redirects | Payment flow | ⬜ |
| 15 | `POST /api/payments/webhook` — handles `subscription_created`, `subscription_updated`, `subscription_cancelled`; stores `plan`, `smartQrLimit` (5 or 50), `status` on `Subscription` row | Billing sync | ⬜ |
| 16 | Billing portal page (link to LS customer portal), `withPlan(minPlan)` server helper + `<PlanGate minPlan="hobby">` client wrapper | Feature gating | ⬜ |

### Phase 4b — QR Creation Flow (Static vs Smart)

**Decision step (step 0):** before filling any content the user picks a mode:

| Mode | Who can use | What they fill in | Billing |
|------|:-----------:|-------------------|---------|
| **Static** | Everyone (anon / Free / Hobby / Pro) | URL · vCard · WiFi · plain text — any content type; colour customisation; "powered by SmartQR" watermark | Free, no slot consumed |
| **Smart** | **Hobby** (up to 5) · **Pro** (up to 50) | URL · One-page website builder — destination changeable at any time | Included in plan; shows remaining slot count |

**Smart QR features (all toggleable during creation and editable later):**
- **Target** — URL redirect (default) or One-page website (builder)
- **Analytics** — ✅ enabled by default *(recommended)*; tracks scan count, country, device, browser, OS, time
- **A/B testing** — off by default; split traffic between two URLs with configurable ratio
- **Colour & logo customisation** — foreground/background colour picker, logo upload
- **Change history** — every target change saved; **Revert** to any previous version

**Smart QR plan gate rules:**
- **Free plan** → Smart QR card is visible but locked with an "Upgrade to Hobby or Pro" CTA.
- **Hobby plan, slots available (< 5 used)** → create immediately, decrement remaining slot count shown in UI.
- **Hobby plan, slots full (5/5)** → blocked with "Upgrade to Pro for 50 slots" CTA.
- **Pro plan, slots available (< 50 used)** → create immediately.
- **Pro plan, slots full (50/50)** → blocked with a contact/enterprise CTA.
- Deleting a Smart QR **frees the slot** back to the plan limit.

| # | Task | Output | Status |
|---|------|--------|--------|
| 4b-0 | Step 0 — mode picker UI: two cards "Static QR" vs "Smart QR"; Smart QR card shows plan slot usage (e.g. "3 / 5 used") and upgrade CTA when locked | Mode selection screen | ⬜ |
| 4b-1 | Static path — multi-step wizard: step 1 choose content type (URL / vCard / WiFi / plain text), step 2 fill content, step 3 customise (colour / logo) → `POST /api/qr/generate` → download PNG / SVG | Static QR creation | ⬜ |
| 4b-2 | Smart path — wizard step 1: choose destination type — **URL** or **One-page website**; `shortCode` generation (8-char nanoid), `POST /api/qr/smart` — creates `QRCode` with `type: SMART`, initial `SmartQRHistory` entry ⚠️ *needs plan-limit check added* | Smart QR in DB | ✅⚠️ |
| 4b-3 | Smart path — wizard step 2: feature toggles — Analytics ✅ (checked, recommended), A/B testing ⬜ (off), colour/logo customisation; save preferences to `QRCode` row | Feature toggles UI | ⬜ |
| 4b-4 | QR preview panel on creation page — live SVG refresh on each form change (shared between static and smart paths) | Real-time preview | ⬜ |
| 4b-5 | Plan gate (Smart path only): server-side check `user.subscription.plan` + count of active Smart QRs → **Free**: block, show upgrade modal (Hobby / Pro); **Hobby at limit (5/5)**: block, show upgrade to Pro modal; **slots available**: create QR, update slot counter in UI | Plan gate | ⬜ |
| 4b-6 | Smart QR edit page (`/dashboard/qr/[id]`): change target URL / swap to one-page builder, toggle analytics & A/B testing, view full change history timeline with **Revert** button ⚠️ *plan-gate guard needs adding* | Editable QR UX | ✅⚠️ |
| 4b-7 | A/B test UI on Smart QR: configure variant B URL + split %, view per-variant scan stats | A/B feature | ✅ |
| 4b-8 | One-page builder integration: template picker (VCARD / CAR / LINK), JSON editor, live preview; `app/p/[slug]/page.tsx` public renderer | Website builder | ⬜ |
| 4b-9 | Redirect endpoint `app/r/[code]/route.ts` — lookup Smart QR → write `Scan` row (only if analytics enabled) → 302 to target URL or one-page slug (A/B logic included) | Live tracking | ✅ |

### Phase 5 — Premium & Polish
| # | Task | Output | Status |
|---|------|--------|--------|
| 17 | Bulk QR operations: multi-select delete, export all as ZIP | Bulk management | ⬜ |
| 18 | QR folder / tagging system for organisation | Organisation | ⬜ |

### Phase 6 — Legal side of things
| # | Task | Output | Status |
|---|------|--------|--------|
| 20 | Temrs of use, cookies, privacy stuff | ⬜ |
| 21 | Big SEO optimalization | ⬜ |


### Phase 7 — Polish & Deploy
| # | Task | Output | Status |
|---|------|--------|--------|
| 22 | Landing page: hero, pricing table (Free / Hobby / Pro tiers with slot counts and CZK prices), FAQ | Marketing | ⬜ |
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
- **Billing:** Three flat subscription tiers — Free (0 Smart QRs), Hobby (5 Smart QRs), Pro (50 Smart QRs). Lemon Squeezy handles VAT/tax for all countries automatically; subscription events synced via signed webhooks (`X-Signature` header verified with HMAC-SHA256). Deleting a Smart QR frees the slot within the plan limit (no prorated refund).
- **Logo upload:** stored in `/public/uploads/[userId]/` locally in dev, S3/R2 bucket in production
- **Feature gating:** `getServerSession()` + `user.subscription.plan` check server-side; `<PlanGate minPlan="hobby">` wrapper client-side; Smart QR slot count enforced in `POST /api/qr/smart` handler
