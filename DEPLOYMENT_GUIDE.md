# Gym Management System — Setup & Deployment Guide

This guide has two parts: **Part 1** gets the app running on your own
computer so you can test it. **Part 2** puts it live on the internet using
Vercel so staff and members can actually use it.

---

## Part 1 — Run It Locally

### Step 1: Install prerequisites

You need these installed on your computer first:

- **Node.js** (version 20 or newer) — download from [nodejs.org](https://nodejs.org)
- **Git** — download from [git-scm.com](https://git-scm.com)
- A code editor like **VS Code** (optional but helpful)

Check they're installed by opening a terminal and running:
```bash
node -v
git --version
```

### Step 2: Get the project onto your computer

Unzip the `gym-management-system.zip` file you downloaded, then open a
terminal inside that folder:
```bash
cd path/to/gym-management-system
```

### Step 3: Install dependencies

```bash
npm install
```
This also automatically runs `prisma generate` (via the `postinstall`
script) — no extra step needed.

### Step 4: Get a database (PostgreSQL)

You don't need to install Postgres on your computer. The easiest path is a
**free cloud database** — this also means your local setup and your future
production setup can literally be the same database if you want:

1. Go to [neon.tech](https://neon.tech) (or [supabase.com](https://supabase.com) — either works)
2. Sign up free, create a new project
3. Copy the **connection string** it gives you — looks like:
   ```
   postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```

*(If you'd rather run Postgres locally instead: install it via
[postgresapp.com](https://postgresapp.com) on Mac, or
[postgresql.org/download](https://www.postgresql.org/download/) on
Windows/Linux, then your connection string will look like
`postgresql://postgres:password@localhost:5432/gym_management`.)*

### Step 5: Get a Cloudinary account (for photos + invoices)

1. Go to [cloudinary.com](https://cloudinary.com), sign up free
2. On your Dashboard, copy: **Cloud Name**, **API Key**, **API Secret**

### Step 6: WhatsApp Business API (can wait for now)

This one takes 1–2 days for Meta to approve, so don't let it block you from
testing everything else. Skip this step for now if you just want to try the
app — WhatsApp sending will simply fail silently and get logged (it won't
crash anything, see `payment.actions.ts`). Come back to this before you go
live — full steps are in **Part 2, Step 9** below.

### Step 7: Configure your environment file

```bash
cp .env.example .env
```
Open `.env` in your code editor and fill in:
- `DATABASE_URL` → your Neon/Supabase/local connection string from Step 4
- `SESSION_SECRET` → run `openssl rand -base64 32` in your terminal and paste the output
- `CRON_SECRET` → same thing, run it again for a different random value
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` → from Step 5
- `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` → whatever you want your first login to be
- Leave WhatsApp variables blank for now if you're skipping Step 6

### Step 8: Set up the database tables

```bash
npx prisma migrate dev --name init
npx tsx prisma/seed.ts
```
The second command creates your first Super Admin login and default gym
settings (using the email/password you set in `.env`).

### Step 9: Start the app

```bash
npm run dev
```
Open **http://localhost:3000/login** in your browser and log in with the
Super Admin email/password you set.

### Step 10: Try the key flows

- **Add a staff member**: Staff Management → Add Staff
- **Add a gym member**: Members → Add Member (try the camera photo capture)
- **Check in a member**: open **http://localhost:3000/scan** in a second tab,
  type the Member ID (e.g. `GYM-0001`)
- **Record a payment**: from a member's profile → Record Payment (if
  Cloudinary is set up, you'll get a real PDF invoice link)
- **View the member self-dashboard**: **http://localhost:3000/member**

If something breaks, check your terminal for the error — it's almost always
a missing/wrong value in `.env`.

---

## Part 2 — Deploy to Vercel (Go Live)

### Step 1: Push your code to GitHub

If you haven't already:
```bash
git init
git add .
git commit -m "Initial commit"
```
Create a new repository on [github.com](https://github.com/new), then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Use a production database

If you used Neon/Supabase in Part 1, you can reuse the **same** database —
or create a fresh project for production so your test data doesn't mix
with real member data. Either way, get that `DATABASE_URL` ready.

### Step 3: Import the project into Vercel

1. Go to [vercel.com](https://vercel.com), sign up/log in (GitHub login is easiest)
2. Click **Add New → Project**
3. Select your GitHub repo
4. Vercel auto-detects Next.js — leave the build settings as default
5. **Don't click Deploy yet** — go to the Environment Variables section first

### Step 4: Add every environment variable

In the same import screen (or later under **Project Settings → Environment Variables**), add every variable from your `.env` file, with real production values:

| Variable | Required | Description / Example |
|---|:---:|---|
| `DATABASE_URL` | **Yes** | Your Neon PostgreSQL connection string (`postgresql://...@...neon.tech/neondb?sslmode=require`) |
| `SESSION_SECRET` | **Yes** | A random secret string for JWT cookies (e.g. `openssl rand -base64 32`) |
| `SEED_SUPER_ADMIN_EMAIL` | **Yes** | Initial Super Admin login email (e.g. `owner@yourgym.com`) |
| `SEED_SUPER_ADMIN_PASSWORD` | **Yes** | Initial Super Admin password |
| `CLOUDINARY_CLOUD_NAME` | **Yes** | Cloudinary cloud name (for member photos + PDF invoices) |
| `CLOUDINARY_API_KEY` | **Yes** | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | **Yes** | Cloudinary API Secret |
| `SMTP_HOST` | **Yes** | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | **Yes** | SMTP port (`587`) |
| `SMTP_USER` | **Yes** | Sender email (e.g. `yourgym@gmail.com`) |
| `SMTP_PASS` | **Yes** | 16-character Google App Password (from `myaccount.google.com/apppasswords`) |
| `SMTP_FROM` | **Yes** | Branded sender header (e.g. `Your Gym <yourgym@gmail.com>`) |
| `SMTP_SECURE` | Optional | `false` (for port 587) or `true` (for port 465) |
| `RAZORPAY_KEY_ID` | Optional | Razorpay Key ID (for online member renewals) |
| `RAZORPAY_KEY_SECRET` | Optional | Razorpay Key Secret |
| `CRON_SECRET` | **Yes** | Secret for daily due reminder cron job |
| `APP_BASE_URL` | **Yes** | Your live production URL (e.g. `https://your-gym.vercel.app`) |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Optional | Upstash Redis for serverless distributed rate limiting |
| `WHATSAPP_PHONE_NUMBER_ID` / `ACCESS_TOKEN` | Optional | Meta WhatsApp Cloud API credentials |

### Step 5: Deploy

Click **Deploy**. Vercel will run `npm install` (which generates the Prisma
Client automatically) and `next build`. Wait for it to finish — you'll get a
live URL like `https://your-gym.vercel.app`.

### Step 6: Run database migrations against production

From your own computer's terminal, pointing at the **production**
`DATABASE_URL`:
```bash
# Temporarily set your terminal to use the production database:
DATABASE_URL="your-production-connection-string" npx prisma migrate deploy
DATABASE_URL="your-production-connection-string" npx tsx prisma/seed.ts
```
This creates your tables and your first Super Admin login on the live
database — it's the same as Part 1, Steps 8, just pointed at production.

### Step 7: Confirm the cron job is active

`vercel.json` already tells Vercel to hit `/api/cron/due-reminders` daily at
09:00. Check **Project Settings → Cron Jobs** in your Vercel dashboard to
confirm it's listed and enabled. It authenticates using the `CRON_SECRET`
you set in Step 4 — Vercel sends this automatically, no extra setup needed.

### Step 8: (Recommended) Set up rate limiting

Public routes (`/scan`, `/member/[code]`) fall back to in-memory rate
limiting by default, which **doesn't work reliably** across Vercel's
serverless functions. For real protection:
1. Go to [upstash.com](https://upstash.com), create a free Redis database
2. Copy the REST URL and REST Token it gives you
3. Add them as `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in
   Vercel's environment variables, then redeploy

### Step 9: Set up WhatsApp (if you skipped it earlier)

1. Go to [business.facebook.com](https://business.facebook.com), create a
   Business Account if you don't have one
2. Add the **WhatsApp** product to a Meta App (developers.facebook.com)
3. Get a phone number verified for WhatsApp Business (Meta provides a free
   test number to start, or connect your own)
4. Copy the **Phone Number ID** and generate a permanent **Access Token**
   (under System Users, for long-lived tokens)
5. Under **Message Templates**, create and submit these two for approval:
   - `payment_due_reminder` — body: `Hi {{1}}, your membership is due on {{2}}. Amount: {{3}}. Please renew soon!`
   - `payment_confirmation` — body: `Hi {{1}}, we've received your payment of {{2}}. Download your receipt: {{3}}`
6. Approval usually takes a few hours to 2 days
7. Add `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` to Vercel's
   environment variables, then redeploy

### Step 10: Update APP_BASE_URL and redeploy

Now that you know your real Vercel URL (or custom domain), go back to
**Project Settings → Environment Variables**, update `APP_BASE_URL` to it,
and click **Redeploy**. This is what the QR code display page and the
WhatsApp invoice links point to.

### Step 11: (Optional) Add a custom domain

**Project Settings → Domains** → add `yourgym.com` and follow Vercel's DNS
instructions. Free SSL is automatic.

### Step 12: Final checklist before handing it to staff

- [ ] Log in as Super Admin, **change the seeded password** immediately
- [ ] Add real staff accounts (Staff Management)
- [ ] Set gym branding + suggested pricing (Settings)
- [ ] Open `/dashboard/attendance/qr-display` on the reception screen/tablet
- [ ] Test one real member registration → payment → check WhatsApp arrives
- [ ] Bookmark `/scan` and `/member` on the reception device for quick access

---

## Troubleshooting Quick Reference

| Problem | Likely cause |
|---|---|
| Build fails on Vercel with a Prisma error | Check `DATABASE_URL` is set correctly in Vercel's env vars |
| "Invalid email or password" on first login | Re-run the seed command — check `SEED_SUPER_ADMIN_EMAIL/PASSWORD` match what you typed |
| Photos don't upload | Check Cloudinary env vars are correct and have no extra spaces |
| WhatsApp messages don't send | Template names must **exactly** match what's approved in Meta Business Manager; check `WhatsAppLog` table in your DB for the logged error |
| QR code points to `localhost` | Update `APP_BASE_URL` in Vercel env vars and redeploy |
| Cron job never runs | Confirm it's listed under Vercel's Cron Jobs tab — it only activates after a successful deploy on a paid or eligible plan tier |
