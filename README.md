# Gym Management System

Production-ready backend architecture for a gym management platform with
RBAC, QR attendance, automated billing, and WhatsApp notifications.

## Folder Structure

```
gym-management-system/
├── prisma/
│   ├── schema.prisma          # All models: User, Member, Subscription, Payment, Attendance, WhatsAppLog, GymSettings
│   └── seed.ts                 # Bootstraps the first SUPER_ADMIN + default GymSettings
│
├── lib/
│   ├── prisma.ts                # Prisma client singleton (dev hot-reload safe)
│   ├── cloudinary.ts            # Photo + invoice PDF uploads
│   ├── whatsapp.ts              # Meta WhatsApp Cloud API client
│   ├── auth/
│   │   ├── session.ts           # JWT session create/read/destroy (httpOnly cookie)
│   │   └── rbac.ts              # PERMISSIONS map + requirePermission()/requireRole() guards
│   ├── pdf/
│   │   └── invoice.tsx          # @react-pdf/renderer invoice template + generator
│   └── utils/
│       └── generators.ts        # Member code / invoice number / date helpers
│
├── middleware.ts                 # Edge RBAC gate for /dashboard/* routes
│
├── app/
│   ├── actions/                  # Server Actions (the primary "API layer")
│   │   ├── auth.actions.ts       # login / logout
│   │   ├── staff.actions.ts      # SUPER_ADMIN-only staff/admin CRUD
│   │   ├── member.actions.ts     # Member registration, update, filtered search, delete
│   │   ├── attendance.actions.ts # Manual staff check-in + history lookup
│   │   └── payment.actions.ts    # recordPayment() — the full billing pipeline
│   │
│   ├── api/
│   │   ├── attendance/checkin/route.ts   # PUBLIC — QR self check-in
│   │   └── cron/due-reminders/route.ts   # Daily WhatsApp due-date reminders
│   │
│   ├── login/                    # (build) login page
│   ├── scan/                     # (build) public QR landing → member code entry
│   ├── member/[code]/            # (build) member self-dashboard
│   └── dashboard/                # staff/admin UI
│       ├── staff-management/     # SUPER_ADMIN only (gated by middleware)
│       ├── members/
│       │   └── new/              # ✅ Add Member form — SUPER_ADMIN, ADMIN & STAFF can all use it
│       │       ├── page.tsx           # role gate (3-layer defense, see comments)
│       │       └── add-member-form.tsx # form: contact details + photo
│       ├── attendance/
│       ├── payments/
│       └── settings/             # SUPER_ADMIN only
│
├── components/
│   ├── shared/
│   │   └── photo-capture.tsx     # ✅ camera capture OR file upload → base64 data URI
│   └── ui/                       # shadcn/ui primitives (button, input, label, card)
│
├── scripts/
│   └── cron-due-reminders.ts     # node-cron alternative for non-Vercel hosts
│
├── vercel.json                   # Vercel Cron config (09:00 daily)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── postcss.config.js
├── .eslintrc.json
├── .gitignore
└── .env.example
```

> Note: `app/scan`, `app/member` pages are still scaffolding markers —
> being built next per the phase plan below. Login + dashboard shell
> (Phase 1) and Add Member (from earlier) are complete.

## Build Phases

- [x] **Phase 1 — Login + Dashboard Shell**: `/login`, role-aware sidebar nav, logout, dashboard home, unauthorized page
- [x] **Add Member** (built ahead of phases): `/dashboard/members/new`
- [x] **Phase 2 — Member Management UI**: members list (search + status filter), member detail page
- [x] **Phase 3 — Attendance**: public QR scan page, staff attendance dashboard, QR code display
- [x] **Phase 4 — Staff Management**: Super Admin table (add/role change/suspend/delete)
- [x] **Phase 5 — Payments & Billing UI**: record payment form, payments/reports list
- [x] **Phase 6 — Member Self-Dashboard**: plan validity, attendance history, receipt download
- [x] **Phase 7 — Hardening**: rate limiting, final config scaffolding (package.json/tsconfig/etc.)

**All 7 phases complete.** The project now installs and runs with just
`npm install` + the setup steps above — no manual dependency wiring needed.

> **Note:** Gym Settings (`/dashboard/settings`) — branding + suggested plan
> pricing — was built ahead of schedule, see "Dynamic Fees" below.

## Dynamic Fees — Every Member's Price Is Independent

Fees were **never** hardcoded to a fixed price list. `Member`/`Subscription`
and `Payment.amount` each store their own value, entered fresh every time —
so two members on the same "3 month plan" can legitimately pay different
amounts (discount, corporate rate, negotiated price, etc.).

What Settings adds is a **suggestion layer** on top of that, nothing more:
- Super Admin sets an optional default price per plan duration in
  `/dashboard/settings` (`GymSettings.defaultPricing`, a simple JSON map like
  `{"1": 1200, "3": 3300}`).
- The Add Member and Record Payment forms auto-fill the fee field from that
  suggestion when a plan duration is picked.
- The instant someone types into the fee field directly, that auto-fill stops
  overriding it (`feeTouched`/`amountTouched` in the form components) — so
  staff can always charge more or less for an individual member without
  fighting the suggestion.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
   (`package.json` already lists everything used across all 7 phases —
   Next.js 15, Prisma, Cloudinary, `@react-pdf/renderer`, WhatsApp/rate-limit
   helpers, and the hand-written shadcn-style UI primitives in `components/ui/`.)

2. **Configure environment**
   ```bash
   cp .env.example .env
   # fill in DATABASE_URL, SESSION_SECRET, Cloudinary + WhatsApp credentials
   ```

3. **Set up the database**
   ```bash
   npx prisma migrate dev --name init
   npx tsx prisma/seed.ts   # creates the first SUPER_ADMIN from .env values
   ```

4. **WhatsApp templates** — In Meta Business Manager, submit and get approval
   for two message templates before the notification pipeline will work:
   - `payment_due_reminder` — body vars: `{{1}}` name, `{{2}}` due date, `{{3}}` amount
   - `payment_confirmation` — body vars: `{{1}}` name, `{{2}}` amount, `{{3}}` invoice link

5. **Cron job**
   - **Vercel**: `vercel.json` already schedules `/api/cron/due-reminders` at
     09:00 daily. In Project Settings → Environment Variables, set
     `CRON_SECRET` — Vercel automatically sends it as the `Authorization:
     Bearer` header on cron invocations.
   - **Self-hosted**: run `npx tsx scripts/cron-due-reminders.ts` as a
     long-lived process (PM2/systemd/Docker), or trigger it once via an
     external scheduler.

6. **Run**
   ```bash
   npm run dev
   ```

## Who Can Add a Member?

**SUPER_ADMIN, ADMIN, and STAFF can all register new members** — with full
contact details and a photo (camera capture or file upload). This is
enforced at three independent layers, so no single missed check exposes it:

1. `middleware.ts` — lets all three roles reach `/dashboard/members/new`
2. `app/dashboard/members/new/page.tsx` — re-checks the role server-side before rendering
3. `registerMember()` in `member.actions.ts` — calls `requirePermission("member:create")`,
   which `lib/auth/rbac.ts` grants to `["SUPER_ADMIN", "ADMIN", "STAFF"]`

Only `MEMBER`-facing self-service actions and the `member:delete` permission
are restricted further (delete is `SUPER_ADMIN`/`ADMIN` only, per spec).

## Security Notes

- **Defense in depth**: `middleware.ts` blocks unauthorized page loads at the
  edge, but every Server Action independently calls `requirePermission()` —
  never rely on the middleware alone, since Server Actions can be invoked
  directly.
- **Rate limit** both public, unauthenticated routes in production (e.g.
  Upstash Ratelimit): `POST /api/attendance/checkin` and `/member/[code]`.
  Both trust "knowing the Member Code" the same way a low-friction reception
  ID badge would — fine for a gym counter, but codes are short and
  sequential (`GYM-0001`), so throttling prevents someone from scripting
  through the range to browse other members' data.
- **`member:delete`** is intentionally restricted to `SUPER_ADMIN`/`ADMIN`
  in `lib/auth/rbac.ts` — staff can register and collect payments but cannot
  delete member records, per spec.
- Passwords are hashed with `bcryptjs` (cost factor 12) — never store or log
  plaintext passwords, including the seeded temporary password.
- The Cloudinary asset rollback in `registerMember()` prevents orphaned
  photos if the DB write fails after upload — a pattern worth repeating
  anywhere else you add file uploads.
