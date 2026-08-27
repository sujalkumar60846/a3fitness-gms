# A3Fitness & Gym Management System (GMS) — Project Context & Architecture

## 📌 Project Overview
This workspace contains a dual-system full-stack fitness enterprise platform:
1. **`main_app`** (Port `3001` in dev): The high-converting public brand website for **A3Fitness** (Luxury Gym & Spa).
2. **`gms`** (Port `3000` in dev): The core **Gym Management System (GMS)** — a Next.js App with Prisma, Neon PostgreSQL, RBAC authentication (Super Admin, Admin, Staff), live QR attendance, Member self-portals, payments, invoices, and trial leads CRM.

---

## 🏗️ Architecture & Component Flow

### 1. `main_app` (Frontend Web Application)
- **Framework**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide React.
- **Key Sections**:
  - **Navbar**: Sticky glass navigation with instant links, Live GMS Sync badge, and Member Portal trigger.
  - **Hero**: Branding header, 3-card stat counters (500+ Active Members, 5+ Elite Coaches, 98.4% Goal Success), and instant Member ID search bar.
  - **Programs**: Cardio Strength, Olympic Lifting, Mind-Body Yoga, HIIT Metabolic, Clinical Nutrition.
  - **Why Choose Us**: World-Class Biomechanics, Smart Attendance & Portal, Tailored Macro Nutrition, Flexible 365-Day Access.
  - **Facilities (Virtual Tour)**: Strength Arena, Cardio Hub, Zen Sanctuary, A3 Clean Fuel Bar.
  - **Pricing**: Dynamic 4-tier plan (₹1,299 / ₹3,300 / ₹6,000 / ₹10,800) live-synced from GMS settings.
  - **Smart Member Hub Widget**: Live connection status with GMS and rapid Member ID lookup.
  - **Testimonials**: Transformation stories.
  - **Modals**:
    - `MemberPortalModal`: Live lookup for any member code (e.g. `GYM-0001`, `GYM-P2ZH3D`) querying real Neon DB data (no fake mocks).
    - `TrialModal`: 3-Day VIP Free Pass form that registers prospective leads directly to the GMS database.
- **API Routes**:
  - `/api/leads`: Proxies and forwards free pass inquiries to `gms/api/leads`.
  - `/api/portal/member/[code]`: Proxies member lookups directly to `gms/api/portal/member/[code]`.
  - `/api/portal/status`: Checks if GMS backend is online.

### 2. `gms` (Gym Management System Backend & Dashboards)
- **Framework & Database**: Next.js 15, Prisma ORM 5.22, PostgreSQL (Hosted on Neon DB).
- **Core Models**:
  - `User`: Staff and Admin accounts with RBAC (`SUPER_ADMIN`, `ADMIN`, `STAFF`).
  - `Member`: Gym members with custom/auto member codes (`GYM-0001`, `GYM-P2ZH3D`), photos, joining dates.
  - `Subscription`: Plan history and expiry tracking.
  - `Payment`: Invoice generation and payment logs.
  - `Attendance`: Daily attendance with unique calendar day constraint per member.
  - `Lead`: Trial pass prospects (`PENDING`, `CONTACTED`, `CONVERTED`, `CANCELLED`).
  - `GymSettings`: Singleton branding, pricing (`1299`, `3300`, `6000`, `10800`), `allowOnlineRenewals`, `allowMemberPhotoUpdate`.
- **Public & Member Routes**:
  - `/member/[code]`: Member self-dashboard with:
    - Member photo in top-right corner with click-to-edit modal (updates photo and Gmail-only email).
    - Super Admin lock enforcement for photo changes.
    - One-click **"Mark Attendance for Today"** button.
    - Subscription validity, PDF invoice downloads, and attendance calendar.
  - `/scan`: Public desk QR code scanner.
  - `/login`: Admin and Staff authentication.
- **Dashboard Routes** (`/dashboard/*`):
  - `/dashboard/analytics`: Revenue, attendance, and member growth charts.
  - `/dashboard/members`: Full member directory with search, filters, and profile view.
  - `/dashboard/members/new`: Register new member (supports auto-prefill when converting leads).
  - `/dashboard/leads`: Trial leads CRM table with **"Convert to Member"** and **"Delete Lead"** actions.
  - `/dashboard/attendance`: Today check-ins, manual check-in override, and QR export.
  - `/dashboard/payments`: Payment recording and invoice downloads.
  - `/dashboard/settings`: Gym branding, pricing manager, and photo update permission toggle (Super Admin only).

---

## 🔑 Environment Variables Reference

### `main_app/.env.local`
```env
NEXT_PUBLIC_GMS_BASE_URL=https://your-gms-domain.vercel.app
NEXT_PUBLIC_GMS_MEMBER_PORTAL_URL=https://your-gms-domain.vercel.app/member
NEXT_PUBLIC_GMS_STAFF_LOGIN_URL=https://your-gms-domain.vercel.app/login
NEXT_PUBLIC_GMS_ATTENDANCE_SCAN_URL=https://your-gms-domain.vercel.app/scan
NEXT_PUBLIC_CLUB_NAME=A3Fitness Gym & Spa
NEXT_PUBLIC_CLUB_PHONE=+91 98765 43210
NEXT_PUBLIC_CLUB_EMAIL=concierge@a3fitness.in
NEXT_PUBLIC_CLUB_CITY=Mumbai, India
```

### `gms/.env`
```env
DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-divine-rain...neon.tech/neondb?sslmode=require"
SESSION_SECRET="your-32-character-random-secret"
SEED_SUPER_ADMIN_EMAIL="admin@a3fitness.in"
SEED_SUPER_ADMIN_PASSWORD="YourSecurePassword123"
CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"
RAZORPAY_KEY_ID="rzp_live_xxx"
RAZORPAY_KEY_SECRET="your_razorpay_secret"
```

---

## 🚀 Deployment Status
- **Development Ports**:
  - `main_app`: `http://localhost:3001`
  - `gms`: `http://localhost:3000`
- **Build Status**: Verified 0 errors on Next.js production builds for both codebases.