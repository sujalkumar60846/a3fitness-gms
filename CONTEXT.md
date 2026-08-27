# A3Fitness & Gym Management System (GMS) — Complete Project Context & Architecture

**Last Updated:** August 27, 2026

---

## 📌 Executive Summary
This enterprise fitness platform comprises two tightly synchronized Next.js 15 applications:
1. **`main_app`** (Frontend Web Application — Port `3001` in Dev):
   - High-converting, luxury fitness web application branded as **A3Fitness** (inspired by `wellnessclub.co.in`).
   - Integrates live pricing, member status verifications, and prospective free trial pass submissions with the GMS backend.
2. **`gms`** (Gym Management System & Member Portal — Port `3000` in Dev):
   - Robust backend and administration platform powered by **Prisma ORM** and **PostgreSQL (Neon Cloud DB)**.
   - Multi-role RBAC (`SUPER_ADMIN`, `ADMIN`, `STAFF`), member directory, QR attendance check-in, trial leads CRM, Cloudinary photo uploads, PDF invoices, and self-service member dashboards.

---

## 🏗️ Architecture & Component Specifications

### 1. `main_app` (A3Fitness Public Portal)
- **Framework & Styling**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide React icons.
- **Brand Identity**: **A3Fitness** (*Luxury Gym & Spa*).
- **Core Sections**:
  - **Sticky Navbar (`Navbar.tsx`)**: Glassmorphism navbar with live GMS synchronization badge (`GMS Sync Active`), member portal lookup trigger, and VIP free pass CTA.
  - **Hero Section (`Hero.tsx`)**: High-impact banner with 3 stat counters (**500+ Active Members**, **5+ Elite Coaches**, **98.4% Goal Success Rate**) and an instant Member ID lookup search bar.
  - **Programs Grid (`ProgramsGrid.tsx`)**: Cardio Strength, Olympic Lifting, Mind-Body Yoga, HIIT Metabolic, and Clinical Nutrition. *(Thermal Spa section removed per brand requirements)*.
  - **Why Choose Us (`WhyChooseUs.tsx`)**: World-Class Biomechanics, Smart Attendance & Portal, Tailored Macro Nutrition, Flexible 365-Day Access.
  - **Facilities Virtual Tour (`Facilities.tsx`)**: Strength Arena, Cardio Hub, Zen Sanctuary, A3 Clean Fuel Bar.
  - **Membership Tiers (`Pricing.tsx`)**: 4-tier pricing model dynamically fetched from GMS database suggested pricing:
    - **1 Month Kickstart**: `₹1,299` / month
    - **3 Months Transformation**: `₹3,300` / quarter
    - **6 Months Performance**: `₹6,000` / 6 months
    - **12 Months VIP All-Access**: `₹10,800` / year
  - **Smart Member & Attendance Hub Widget (`PortalWidget.tsx`)**: Displays connected GMS status and direct links to QR Scan desk & Staff login.
  - **Transformation Testimonials (`Testimonials.tsx`)**: Member success stories.
  - **Global Modals**:
    - `MemberPortalModal.tsx`: Real-time member verification querying live Neon DB data (no fake mocks). Automatically populated from Hero search.
    - `TrialModal.tsx`: 3-Day VIP Free Pass form that registers prospective leads directly into the GMS `Lead` table.

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
  - **Access Restriction**: Free pass claimants remain prospective leads and are not given active member dashboard access until officially converted.

- **API Routes**:
  - `GET /api/portal/settings`: Public endpoint providing live suggested pricing and branding to `main_app`.
  - `GET /api/portal/member/[code]`: Public endpoint returning real database profile data for valid member IDs (returns 404 for invalid IDs without fake fallbacks).
  - `POST /api/leads`: Public endpoint accepting free pass submissions from `main_app`.
  - `POST /api/attendance/checkin`: Public QR scan endpoint for front desk check-in.

---

## 🔑 Environment Variables Reference

### `main_app/.env.local`
```env
# Connected Testing GMS Website URL
NEXT_PUBLIC_GMS_BASE_URL=http://localhost:3000
GMS_API_SECRET=dev-secret-key

# Member Portal URLs
NEXT_PUBLIC_GMS_MEMBER_PORTAL_URL=http://localhost:3000/member
NEXT_PUBLIC_GMS_STAFF_LOGIN_URL=http://localhost:3000/login
NEXT_PUBLIC_GMS_ATTENDANCE_SCAN_URL=http://localhost:3000/scan

# App Metadata
NEXT_PUBLIC_CLUB_NAME=A3Fitness Gym & Spa
NEXT_PUBLIC_CLUB_PHONE=+91 98765 43210
NEXT_PUBLIC_CLUB_EMAIL=concierge@a3fitness.in
NEXT_PUBLIC_CLUB_CITY=Mumbai, India
```

### `gms/.env`
```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://neondb_owner:npg_Il1Px0hZuLfk@ep-divine-rain-ax3eku3i.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Auth / Session Secret
SESSION_SECRET="sujalmohitprabhatanshu"

# Super Admin Bootstrap Credentials
SEED_SUPER_ADMIN_EMAIL="pradeep@yourgym.com"
SEED_SUPER_ADMIN_PASSWORD="sujal123"

# Cloudinary (Member Photos & PDF Invoices)
CLOUDINARY_CLOUD_NAME="yp2wb7d6"
CLOUDINARY_API_KEY="954934728883496"
CLOUDINARY_API_SECRET="your_cloudinary_secret"

# Optional Razorpay Online Renewal Keys
RAZORPAY_KEY_ID=""
RAZORPAY_KEY_SECRET=""
```

---

## 🚀 Deployment & Git Configuration

### 1. `gms` Git Repository
- **Remote URL**: `https://github.com/sujalkumar60846/a3fitness-gms.git`
- **Branch**: `main`
- **Initial Commit**: Staged and committed with message `feat: complete A3Fitness GMS system with trial leads, dynamic pricing, and attendance`.
- **Push Command** (run in PowerShell):
  ```powershell
  Set-Location "D:\gym project\gms"
  git push -u origin main
  ```

### 2. `main_app` Git Repository
- **Target Remote**: `https://github.com/sujalkumar60846/a3fitness-web.git`
- **Push Command** (run in PowerShell):
  ```powershell
  Set-Location "D:\gym project\main_app"
  git init
  git add .
  git commit -m "feat: A3Fitness frontend website with live GMS portal integration"
  git branch -M main
  git remote add origin https://github.com/sujalkumar60846/a3fitness-web.git
  git push -u origin main
  ```

---

## ⚡ Local Dev Port Mapping
- **A3Fitness Web App**: `http://localhost:3001`
- **GMS Admin & Leads Dashboard**: `http://localhost:3000/dashboard/leads`
- **Member Self-Service Dashboard**: `http://localhost:3000/member/GYM-0001`
- **Public Attendance QR Scanner**: `http://localhost:3000/scan`