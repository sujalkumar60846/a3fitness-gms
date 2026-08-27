"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { toCalendarDate } from "@/lib/utils/generators";
import { Prisma } from "@prisma/client";
import { z } from "zod";

type ActionResult<T = undefined> = { success: true; data?: T; message?: string } | { success: false; error: string };

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
 * - Updates photo (if enabled by Super Admin in GymSettings)
 * - Updates email (strictly restricted to @gmail.com)
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

    // 2. Email update validation (GMAIL ONLY requirement)
    let cleanEmail: string | null | undefined = undefined;
    if (email !== undefined) {
      const trimmedEmail = email?.trim().toLowerCase() ?? "";
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

    revalidatePath(`/member/${cleanCode}`);
    return { success: true, message: "Profile updated successfully!" };
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