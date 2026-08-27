"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";
import { toCalendarDate } from "@/lib/utils/generators";
import { Prisma } from "@prisma/client";

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

/**
 * Staff-facing manual check-in (dashboard fallback when a member forgot
 * their phone / QR scanning fails at the counter). The public, unauthenticated
 * QR self-check-in flow lives in app/api/attendance/checkin/route.ts — kept
 * separate because it must NOT require a staff session.
 */
export async function markAttendanceManually(memberId: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("attendance:mark_manual");
    const today = toCalendarDate();

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member) return { success: false, error: "Member not found." };
    if (!member.isActive) return { success: false, error: "This member is deactivated." };

    try {
      await prisma.attendance.create({
        data: {
          memberId,
          date: today,
          method: "MANUAL",
          markedById: session.userId,
        },
      });
    } catch (err) {
      // P2002 = unique constraint violation -> already checked in today.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return { success: false, error: "This member has already checked in today." };
      }
      throw err;
    }

    revalidatePath("/dashboard/attendance");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function listTodayAttendance() {
  await requirePermission("attendance:view");
  const today = toCalendarDate();
  return prisma.attendance.findMany({
    where: { date: today },
    include: { member: { select: { fullName: true, memberCode: true, photoUrl: true } } },
    orderBy: { checkInTime: "desc" },
  });
}

export type MonthAttendanceSummary = {
  monthKey: string; // e.g. "2026-08"
  label: string;    // e.g. "Aug 2026"
  year: number;
  month: number;    // 1-12
  daysInMonth: number;
  attendedCount: number;
  percentage: number;
  attendedDays: number[]; // e.g. [1, 2, 4, 8, 15]
  attendances: {
    id: string;
    day: number;
    checkInTime: string;
    method: "QR" | "MANUAL";
  }[];
};

export type MemberAttendanceAnalytics = {
  totalCheckIns: number;
  currentStreak: number;
  longestStreak: number;
  monthlyAverage: number;
  bestMonth: { label: string; count: number } | null;
  thisMonthCount: number;
  months: MonthAttendanceSummary[];
};

/**
 * Calculates full lifetime attendance streak, monthly breakdown, and averages
 * for a member from their joining date to the current month.
 */
export async function getMemberAttendanceStats(memberId: string): Promise<MemberAttendanceAnalytics> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, joiningDate: true, createdAt: true },
  });

  if (!member) {
    return {
      totalCheckIns: 0,
      currentStreak: 0,
      longestStreak: 0,
      monthlyAverage: 0,
      bestMonth: null,
      thisMonthCount: 0,
      months: [],
    };
  }

  const attendances = await prisma.attendance.findMany({
    where: { memberId },
    orderBy: { date: "asc" },
    select: { id: true, date: true, checkInTime: true, method: true },
  });

  const now = new Date();
  const startRefDate = new Date(member.joiningDate || member.createdAt);

  // Group attendances by YYYY-MM
  const monthMap = new Map<string, typeof attendances>();
  const dateSet = new Set<string>();

  for (const a of attendances) {
    const d = new Date(a.date);
    const dateStr = d.toISOString().split("T")[0];
    dateSet.add(dateStr);

    const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, []);
    }
    monthMap.get(monthKey)!.push(a);
  }

  // Calculate Streak
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  // Sorted unique date strings in ascending order
  const sortedDates = Array.from(dateSet).sort();

  if (sortedDates.length > 0) {
    let prevDate: Date | null = null;

    for (const dStr of sortedDates) {
      const currDate = new Date(dStr);
      if (prevDate) {
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak += 1;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }

      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
      prevDate = currDate;
    }

    // Check if current streak is active (checked in today or yesterday)
    const todayStr = toCalendarDate(now).toISOString().split("T")[0];
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toCalendarDate(yesterday).toISOString().split("T")[0];

    if (dateSet.has(todayStr) || dateSet.has(yesterdayStr)) {
      let checkDate = dateSet.has(todayStr) ? new Date(todayStr) : new Date(yesterdayStr);
      while (dateSet.has(checkDate.toISOString().split("T")[0])) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }
  }

  // Generate all months from joining date to now
  const months: MonthAttendanceSummary[] = [];
  const startYear = startRefDate.getFullYear();
  const startMonth = startRefDate.getMonth();
  const endYear = now.getFullYear();
  const endMonth = now.getMonth();

  let iterDate = new Date(startYear, startMonth, 1);
  const stopDate = new Date(endYear, endMonth, 1);

  let bestMonth: { label: string; count: number } | null = null;
  let thisMonthCount = 0;

  while (iterDate <= stopDate) {
    const y = iterDate.getFullYear();
    const m = iterDate.getMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const label = iterDate.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    const daysInMonth = new Date(y, m, 0).getDate();

    const monthAtts = monthMap.get(monthKey) || [];
    const attendedDays = Array.from(new Set(monthAtts.map((a) => new Date(a.date).getUTCDate()))).sort((a, b) => a - b);
    const attendedCount = attendedDays.length;
    const percentage = Math.round((attendedCount / daysInMonth) * 100);

    if (monthKey === `${endYear}-${String(endMonth + 1).padStart(2, "0")}`) {
      thisMonthCount = attendedCount;
    }

    if (!bestMonth || attendedCount > bestMonth.count) {
      bestMonth = { label, count: attendedCount };
    }

    months.push({
      monthKey,
      label,
      year: y,
      month: m,
      daysInMonth,
      attendedCount,
      percentage,
      attendedDays,
      attendances: monthAtts.map((a) => ({
        id: a.id,
        day: new Date(a.date).getUTCDate(),
        checkInTime: new Date(a.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
        method: a.method as "QR" | "MANUAL",
      })),
    });

    iterDate.setMonth(iterDate.getMonth() + 1);
  }

  // Reverse so newest month is first
  months.reverse();

  const totalMonthsCount = months.length || 1;
  const monthlyAverage = Math.round((attendances.length / totalMonthsCount) * 10) / 10;

  return {
    totalCheckIns: attendances.length,
    currentStreak,
    longestStreak,
    monthlyAverage,
    bestMonth: bestMonth && bestMonth.count > 0 ? bestMonth : null,
    thisMonthCount,
    months,
  };
}

/** Used by the member self-dashboard — no staff session required. */
export async function getMemberAttendanceHistory(memberId: string, limit = 30) {
  return prisma.attendance.findMany({
    where: { memberId },
    orderBy: { date: "desc" },
    take: limit,
  });
}

/**
 * Lightweight search for the manual attendance widget — returns just enough
 * to render a result list + a "already checked in today" flag.
 */
export async function searchMembersForCheckin(query: string) {
  await requirePermission("attendance:mark_manual");
  if (!query || query.trim().length < 2) return [];

  const today = toCalendarDate();
  const q = query.trim();

  const members = await prisma.member.findMany({
    where: {
      isActive: true,
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { memberCode: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      memberCode: true,
      photoUrl: true,
      attendances: { where: { date: today }, select: { id: true } },
    },
    take: 8,
  });

  return members.map((m) => ({
    id: m.id,
    fullName: m.fullName,
    memberCode: m.memberCode,
    photoUrl: m.photoUrl,
    alreadyCheckedIn: m.attendances.length > 0,
  }));
}

function errorMessage(err: unknown): string {
  if (err instanceof z.ZodError) return err.errors.map((e) => e.message).join(", ");
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
