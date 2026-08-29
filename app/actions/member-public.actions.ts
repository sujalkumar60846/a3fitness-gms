"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toCalendarDate } from "@/lib/utils/generators";
import { Prisma } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";
import { sendEmailWelcome } from "@/lib/email";
import { z } from "zod";

type ActionResult<T = undefined> = { success: true; data?: T; message?: string } | { success: false; error: string };

const MEMBER_SESSION_COOKIE = "gym_member_session";

/**
 * MEMBER LOGIN via Registered Mobile Number + 4-digit Unique ID / PIN.
 * Sets a persistent session cookie valid for 1 year until manual logout.
 */
export async function loginMemberWithPhoneAndPin({
  phone,
  pinOrCode,
}: {
  phone: string;
  pinOrCode: string;
}): Promise<ActionResult<{ memberCode: string; name: string }>> {
  try {
    const rawPhone = phone.trim().replace(/\D/g, ""); // extract only digits
    if (rawPhone.length < 10) {
      return { success: false, error: "Please enter a valid 10-digit registered mobile number." };
    }

    const cleanPin = pinOrCode.trim().toUpperCase();
    if (!cleanPin) {
      return { success: false, error: "Please enter your 4-digit Unique ID / PIN." };
    }

    const tenDigitPhone = rawPhone.slice(-10);

    // Search members matching the phone number (either exact or ends with 10 digits)
    const candidates = await prisma.member.findMany({
      where: {
        OR: [
          { phone: { endsWith: tenDigitPhone } },
          { phone: { equals: phone.trim() } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        memberCode: true,
        phone: true,
        isActive: true,
      },
    });

    if (candidates.length === 0) {
      return {
        success: false,
        error: "No member account found with this mobile number. Please check your number or contact reception.",
      };
    }

    // Verify 4-digit unique code / PIN against memberCode
    const member = candidates.find((m) => {
      const code = m.memberCode.toUpperCase();
      const codeDigits = code.replace(/\D/g, "");
      const last4Chars = code.slice(-4);
      const last4Digits = codeDigits.slice(-4);

      return (
        code === cleanPin ||
        last4Chars === cleanPin ||
        last4Digits === cleanPin ||
        codeDigits === cleanPin ||
        code.endsWith(cleanPin)
      );
    });

    if (!member) {
      return {
        success: false,
        error: "Invalid 4-digit Unique ID. (Tip: Use the 4 digits or last 4 characters of your Member Code, e.g. '0001' from 'GYM-0001').",
      };
    }

    // Set persistent session cookie (valid for 1 year)
    const sessionData = JSON.stringify({
      memberCode: member.memberCode,
      phone: member.phone,
      fullName: member.fullName,
      loginAt: new Date().toISOString(),
    });

    const cookieStore = await cookies();
    cookieStore.set(MEMBER_SESSION_COOKIE, sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year persistence
      path: "/",
    });

    // Log audit event
    await logAuditEvent({
      action: "MEMBER_LOGGED_IN",
      category: "MEMBER",
      actorName: `${member.fullName} (${member.memberCode})`,
      actorRole: "MEMBER",
      targetName: member.memberCode,
      details: `Member logged in via registered mobile (${member.phone}) and verified 4-digit PIN.`,
    });

    return {
      success: true,
      data: {
        memberCode: member.memberCode,
        name: member.fullName,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Authentication failed. Please try again.",
    };
  }
}

/**
 * MEMBER LOGOUT — Destroys persistent session cookie.
 */
export async function logoutMember(): Promise<ActionResult> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(MEMBER_SESSION_COOKIE);
    return { success: true };
  } catch (err) {
    return { success: false, error: "Logout failed" };
  }
}

/**
 * Checks if the current browser session has a logged-in member.
 */
export async function getAuthenticatedMemberSession(): Promise<{
  memberCode: string;
  phone: string;
  fullName: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(MEMBER_SESSION_COOKIE)?.value;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * PUBLIC lookup — Returns member profile & dashboard data.
 */
export async function getMemberDashboardByCode(memberCode: string) {
  return prisma.member.findUnique({
    where: { memberCode: memberCode.toUpperCase() },
    select: {
      id: true,
      fullName: true,
      memberCode: true,
      photoUrl: true,
      email: true,
      phone: true,
      gender: true,
      joiningDate: true,
      isActive: true,
      subscriptions: {
        orderBy: { dueDate: "desc" },
        take: 1,
        select: { planMonths: true, startDate: true, dueDate: true, status: true },
      },
      payments: {
        orderBy: { paidAt: "desc" },
        select: { id: true, invoiceNumber: true, amount: true, paidAt: true, invoiceUrl: true },
      },
      attendances: {
        orderBy: { date: "desc" },
        take: 30,
        select: { id: true, date: true, checkInTime: true },
      },
    },
  });
}

/**
 * PUBLIC self-service profile update:
 * - Updates photo (if enabled by Super Admin in GymSettings via allowMemberPhotoUpdate)
 * - Updates email (if enabled by Super Admin via allowMemberEmailUpdate, strictly restricted to @gmail.com)
 * - Auto-dispatches welcome/notification email via SMTP upon adding Gmail
 * - Creates an Audit Log entry for Super Admin tracking
 */
export async function updateMemberProfileByCode({
  memberCode,
  photoUrl,
  email,
}: {
  memberCode: string;
  photoUrl?: string | null;
  email?: string | null;
}): Promise<ActionResult> {
  try {
    const cleanCode = memberCode.trim().toUpperCase();
    const member = await prisma.member.findUnique({
      where: { memberCode: cleanCode },
    });

    if (!member) {
      return { success: false, error: "Member not found." };
    }

    const settings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });

    // 1. Photo update validation
    if (photoUrl !== undefined && photoUrl !== member.photoUrl) {
      if (settings && settings.allowMemberPhotoUpdate === false) {
        return {
          success: false,
          error: "Photo updates have been locked by the gym administration. Please visit reception for photo changes.",
        };
      }
    }

    // 2. Email update validation (GMAIL ONLY requirement + Admin Lock Control)
    let cleanEmail: string | null | undefined = undefined;
    const isEmailChanging = email !== undefined && email?.trim().toLowerCase() !== (member.email?.toLowerCase() ?? "");

    if (email !== undefined) {
      const trimmedEmail = email?.trim().toLowerCase() ?? "";

      if (isEmailChanging && settings && settings.allowMemberEmailUpdate === false) {
        return {
          success: false,
          error: "Gmail updates have been locked by the Super Admin. Please visit reception to update your registered email.",
        };
      }

      if (trimmedEmail !== "") {
        if (!trimmedEmail.endsWith("@gmail.com")) {
          return {
            success: false,
            error: "Only Gmail addresses (@gmail.com) are accepted for member email updates.",
          };
        }
        cleanEmail = trimmedEmail;
      } else {
        cleanEmail = null;
      }
    }

    await prisma.member.update({
      where: { id: member.id },
      data: {
        ...(photoUrl !== undefined ? { photoUrl } : {}),
        ...(cleanEmail !== undefined ? { email: cleanEmail } : {}),
      },
    });

    // 3. Audit Logging & SMTP Notification
    if (photoUrl !== undefined && photoUrl !== member.photoUrl) {
      await logAuditEvent({
        action: "MEMBER_PHOTO_UPDATED",
        category: "MEMBER",
        actorName: `${member.fullName} (${member.memberCode})`,
        actorRole: "MEMBER",
        targetName: member.memberCode,
        details: "Member uploaded/updated their personal profile photo.",
      });
    }

    if (isEmailChanging && cleanEmail) {
      await logAuditEvent({
        action: "MEMBER_EMAIL_UPDATED",
        category: "MEMBER",
        actorName: `${member.fullName} (${member.memberCode})`,
        actorRole: "MEMBER",
        targetName: member.memberCode,
        details: `Member linked/updated their Gmail address to "${cleanEmail}". SMTP notification features enabled.`,
      });

      // Send confirmation email via SMTP
      try {
        const gymTitle = settings?.gymName || "A3Fitness Luxury Gym & Spa";
        const appBaseUrl = process.env.APP_BASE_URL || "https://a3fitness-gms.vercel.app";
        await sendEmailWelcome({
          to: cleanEmail,
          memberName: member.fullName,
          memberCode: member.memberCode,
          gymName: gymTitle,
          portalUrl: `${appBaseUrl}/member/${member.memberCode}`,
        });
      } catch (emailErr) {
        console.error("Failed to send welcome verification email to new Gmail:", emailErr);
      }
    }

    revalidatePath(`/member/${cleanCode}`);
    return {
      success: true,
      message: cleanEmail
        ? `Profile updated! Gmail "${cleanEmail}" is now active for SMTP receipts & notifications.`
        : "Profile updated successfully!",
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update profile." };
  }
}

/**
 * PUBLIC self-service attendance mark:
 * - Member clicks "Mark Attendance Today" on their own dashboard
 * - Immediately records attendance for the current calendar day
 */
export async function markMemberAttendanceSelf(memberCode: string): Promise<ActionResult<{ checkInTime: string }>> {
  try {
    const cleanCode = memberCode.trim().toUpperCase();
    const member = await prisma.member.findUnique({
      where: { memberCode: cleanCode },
    });

    if (!member) {
      return { success: false, error: "Member code not found." };
    }

    if (!member.isActive) {
      return { success: false, error: "Your membership is currently inactive. Please speak with reception." };
    }

    const today = toCalendarDate();

    // Check if already checked in today
    const existing = await prisma.attendance.findUnique({
      where: {
        memberId_date: {
          memberId: member.id,
          date: today,
        },
      },
    });

    if (existing) {
      const timeStr = new Date(existing.checkInTime).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return {
        success: true,
        data: { checkInTime: timeStr },
        message: `You are already checked in for today at ${timeStr}.`,
      };
    }

    const record = await prisma.attendance.create({
      data: {
        memberId: member.id,
        date: today,
        method: "QR",
      },
    });

    const checkInTimeStr = new Date(record.checkInTime).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    revalidatePath(`/member/${cleanCode}`);
    return {
      success: true,
      data: { checkInTime: checkInTimeStr },
      message: `Welcome to the gym! Attendance marked for today at ${checkInTimeStr}.`,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { success: true, message: "Attendance has already been recorded for today." };
    }
    return { success: false, error: err instanceof Error ? err.message : "Failed to mark attendance." };
  }
}