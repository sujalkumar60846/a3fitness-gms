# A3Fitness & Gym Management System (GMS) — Complete Project Context & Architecture

**Last Updated:** August 27, 2026  
**Status:** Production Ready & Deployed on Vercel

---

## 📌 Executive Summary
This enterprise fitness platform comprises two tightly synchronized Next.js 15 applications:
1. **`main_app`** (A3Fitness Public Web Portal — Target Domain: `https://a3fitness-web.vercel.app` | Port `3001` in Dev):
   - High-converting, luxury fitness web application branded as **A3Fitness Luxury Gym & Spa**.
   - Features club amenities, workout programs, interactive virtual tour, live dynamic pricing from GMS, instant member lookup modal, and 3-Day VIP Free Pass lead capture.
   - Physical Location: **Opposite Aakash Healthcare, Gate No. 4, Sector 3, Dwarka, New Delhi 110059**.
2. **`gms`** (Gym Management System & Member Portal — Production URL: `https://a3fitness-gms.vercel.app` | Port `3000` in Dev):
   - Comprehensive backend and administration platform powered by **Prisma ORM** and **PostgreSQL (Neon Cloud DB)**.
   - Multi-role RBAC (`SUPER_ADMIN`, `ADMIN`, `STAFF`), member directory, dynamic QR attendance check-in desk, trial leads CRM with one-click member conversion, Cloudinary photo uploads, auto-generated PDF invoices, email notifications, and self-service member dashboards.

---

## 📍 Flagship Club Information
- **Brand Title:** A3Fitness Luxury Gym & Spa
- **Physical Address:** Opposite Aakash Healthcare, Gate No. 4, Sector 3, Dwarka, New Delhi – 110059
- **Phone / Hotline:** +91 95601 40568
- **Email:** Pspradeepsharma752@gmail.com
- **Operating Hours:**
  - Mon – Sat: 5:30 AM – 11:00 PM
  - Sun: 8:00 AM – 11:59 AM

---

## 🏗️ Architecture & Component Specifications

### 1. `main_app` (A3Fitness Public Portal)
- **Framework & Styling**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide React icons.
- **Brand Identity**: **A3Fitness** (*Luxury Gym & Spa*).
- **Core Sections**:
  - **Sticky Navbar (`Navbar.tsx`)**: Glassmorphism navbar with live GMS synchronization badge (`GMS Sync Active`), member portal lookup trigger, and VIP free pass CTA.
  - **Hero Section (`Hero.tsx`)**: High-impact banner with location pill (*Dwarka Sector 3, New Delhi*), 3 stat counters (**500+ Active Members**, **5+ Elite Coaches**, **98.4% Goal Success Rate**) and an instant Member ID lookup search bar.
  - **Programs Grid (`ProgramsGrid.tsx`)**: Cardio Strength, Olympic Lifting, Mind-Body Yoga, HIIT Metabolic, and Clinical Nutrition.
  - **Why Choose Us (`WhyChooseUs.tsx`)**: World-Class Biomechanics, Smart Attendance & Portal, Tailored Macro Nutrition, Flexible 365-Day Access.
  - **Facilities Virtual Tour (`Facilities.tsx`)**: Strength Arena, Cardio Hub, Zen Sanctuary, A3 Clean Fuel Bar.
  - **Membership Tiers (`Pricing.tsx`)**: 4-tier pricing model dynamically fetched from GMS database suggested pricing:
    - **1 Month Kickstart**: `₹1,299` / month
    - **3 Months Transformation**: `₹3,300` / quarter
    - **6 Months Performance**: `₹6,000` / 6 months
    - **12 Months VIP All-Access**: `₹10,800` / year
  - **Smart Member & Attendance Hub Widget (`PortalWidget.tsx`)**: Displays live connected GMS status and direct links to QR Scan desk & Staff login.
  - **Transformation Testimonials (`Testimonials.tsx`)**: Member success stories.
  - **Footer (`Footer.tsx`)**: Full club address, interactive Google Maps directions link, hours, quick links, and GMS portals.
  - **Global Modals**:
    - `MemberPortalModal.tsx`: Real-time member verification querying live Neon DB data (no fake mocks). Automatically populated from Hero search.
    - `TrialModal.tsx`: 3-Day VIP Free Pass form that registers prospective leads directly into the GMS `Lead` table with Dwarka branch tag.

---

### 2. `gms` (Gym Management System Backend)
- **Database & ORM**: PostgreSQL (Neon Cloud DB) with Prisma ORM 5.22.
- **Database Schema Models (`prisma/schema.prisma`)**:
  - `User`: Internal staff & admin accounts with RBAC (`SUPER_ADMIN`, `ADMIN`, `STAFF`).
  - `Member`: Gym members identified by unique `memberCode` (e.g. `GYM-0001`, `GYM-P2ZH3D`), photos, joining date, status.
  - `Subscription`: Plan periods, renewal expiry dates (`dueDate`), and status (`ACTIVE`, `EXPIRED`, `CANCELLED`).
  - `Payment`: Invoice numbering (`INV-YYYY-XXXXXX`), Cloudinary PDF invoice URLs, amounts.
  - `Attendance`: Daily attendance with database-level uniqueness constraint (`@@unique([memberId, date])`).
  - `Lead`: Prospective free pass and trial inquiries (`PENDING`, `CONTACTED`, `CONVERTED`, `CANCELLED`).
  - `GymSettings`: Singleton configuration containing `gymName`, `defaultPricing` (`{"1": 1299, "3": 3300, "6": 6000, "12": 10800}`), `allowOnlineRenewals`, and `allowMemberPhotoUpdate`.

- **Dynamic Attendance QR Scanner (`/dashboard/attendance/qr-display`)**:
  - Dynamically extracts incoming request headers (`x-forwarded-host` / `host`) and `lib/utils/url.ts` to automatically generate the QR code pointing directly to `https://a3fitness-gms.vercel.app/scan` (or any custom domain).

- **Member Self-Service Dashboard (`/member/[code]`)**:
  - **Top-Right Corner Member Avatar (`member-profile-card.tsx`)**: Touch/click opens member profile details modal.
  - **Profile Photo & Email Updates**: Members can upload/capture photos at any time (unless locked by Super Admin) and update their email address (**strictly restricted to `@gmail.com` addresses**).
  - **Super Admin Lock Control**: Super Admin can toggle `allowMemberPhotoUpdate` in `/dashboard/settings` to prevent members from modifying their photos.
  - **One-Click Daily Attendance (`member-attendance-button.tsx`)**: Prominent attendance button on dashboard that records check-in for the day and transitions to `✓ Attendance Marked For Today (Checked in at HH:MM)`.
  - **Plan Expiry & Invoices**: Shows plan validity countdown, downloadable tax invoices, and attendance streak insights.

- **Trial Leads CRM (`/dashboard/leads`)**:
  - Accessible to **Super Admin**, **Admin**, and **Staff**.
  - Displays all 3-Day VIP Free Pass claimants with full name, contact phone, email, preferred slot, location, and claim date.
  - **Convert to Member Action**: Pre-fills the registration form at `/dashboard/members/new` with the lead's name, phone, and email, and updates lead status to `CONVERTED`.
  - **Delete Lead Action**: Allows deleting lead records.

- **API Routes**:
  - `GET /api/portal/settings`: Public endpoint providing live suggested pricing and branding to `main_app`.
  - `GET /api/portal/member/[code]`: Public endpoint returning real database profile data for valid member IDs (returns 404 for invalid IDs without fake fallbacks).
  - `POST /api/leads`: Public endpoint accepting free pass submissions from `main_app`.
  - `POST /api/attendance/checkin`: Public QR scan endpoint for front desk check-in.

---

## 🔑 Environment Variables Reference

### `main_app/.env.production` (Vercel Direct Import)
```env
NEXT_PUBLIC_GMS_BASE_URL=https://a3fitness-gms.vercel.app
GMS_API_SECRET=dev-secret-key
NEXT_PUBLIC_GMS_MEMBER_PORTAL_URL=https://a3fitness-gms.vercel.app/member
NEXT_PUBLIC_GMS_STAFF_LOGIN_URL=https://a3fitness-gms.vercel.app/login
NEXT_PUBLIC_GMS_ATTENDANCE_SCAN_URL=https://a3fitness-gms.vercel.app/scan
NEXT_PUBLIC_CLUB_NAME=A3Fitness Luxury Gym & Spa
NEXT_PUBLIC_CLUB_PHONE=+91 95601 40568
NEXT_PUBLIC_CLUB_EMAIL=Pspradeepsharma752@gmail.com
NEXT_PUBLIC_CLUB_CITY=New Delhi, India
NEXT_PUBLIC_CLUB_ADDRESS=Opposite Aakash Healthcare, Gate No. 4, Sector 3, Dwarka, New Delhi 110059
```

### `gms/.env` (GMS Production Configuration)
```env
DATABASE_URL="postgresql://neondb_owner:npg_Il1Px0hZuLfk@ep-divine-rain-ax3eku3i.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"
SESSION_SECRET="sujalmohitprabhatanshu"
SEED_SUPER_ADMIN_EMAIL="pradeep@yourgym.com"
SEED_SUPER_ADMIN_PASSWORD="sujal123"
CLOUDINARY_CLOUD_NAME="yp2wb7d6"
CLOUDINARY_API_KEY="954934728883496"
CLOUDINARY_API_SECRET="X_6doOPGQg8JCdfGwFpHOapqJkE"
APP_BASE_URL="https://a3fitness-gms.vercel.app"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="sujalkumar60846@gmail.com"
SMTP_PASS="kcbv raaa feya otyp"
SMTP_FROM="Pradeep Gym <sujalkumar60846@gmail.com>"
SMTP_SECURE="false"
CRON_SECRET="sujalmohitprabhatanshuankitamitrudramahi"
CRON_TIMEZONE="Asia/Kolkata"
```

---

## 🚀 Deployment & Git Repositories

### 1. `gms` (Backend & Member Portal)
- **Repository:** `https://github.com/sujalkumar60846/a3fitness-gms.git`
- **Branch:** `main`
- **Live Vercel URL:** `https://a3fitness-gms.vercel.app`
- **Push Command:**
  ```powershell
  Set-Location "D:\gym project\gms"
  git push origin main
  ```

### 2. `main_app` (Public Website)
- **Repository:** `https://github.com/sujalkumar60846/a3fitness-web.git`
- **Branch:** `main`
- **Target Vercel URL:** `https://a3fitness-web.vercel.app`
- **Push Command:**
  ```powershell
  Set-Location "D:\gym project\main_app"
  git remote add origin https://github.com/sujalkumar60846/a3fitness-web.git
  git push -u origin main
  ```

---

## ⚡ Production & Local URL Mapping
| Feature / Page | Production URL | Local Dev URL |
| :--- | :--- | :--- |
| **A3Fitness Public Website** | `https://a3fitness-web.vercel.app` | `http://localhost:3001` |
| **GMS Admin & Leads Dashboard** | `https://a3fitness-gms.vercel.app/dashboard/leads` | `http://localhost:3000/dashboard/leads` |
| **Member Self-Service Portal** | `https://a3fitness-gms.vercel.app/member/GYM-0001` | `http://localhost:3000/member/GYM-0001` |
| **Counter QR Attendance Scanner** | `https://a3fitness-gms.vercel.app/scan` | `http://localhost:3000/scan` |
| **Admin QR Display Desk** | `https://a3fitness-gms.vercel.app/dashboard/attendance/qr-display` | `http://localhost:3000/dashboard/attendance/qr-display` |