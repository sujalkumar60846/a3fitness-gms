"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";

export type AnalyticsTimeframe = "7d" | "30d" | "90d" | "6m" | "1y" | "all";

export type HistoricalMonthlyStat = {
  monthKey: string; // e.g. "2026-08"
  label: string;    // e.g. "Aug 2026"
  year: number;
  month: number;    // 1-12
  revenue: number;
  paymentsCount: number;
  newMembers: number;
  attendanceCount: number;
  avgDailyAttendance: number;
  revenueGrowthVsPrev: number; // percentage vs previous month
  attendanceGrowthVsPrev: number;
  paymentMethods: { method: string; count: number; amount: number }[];
};

export async function getGymAnalytics(timeframe: AnalyticsTimeframe = "30d") {
  await requirePermission("payment:view_reports");

  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Determine start boundary based on timeframe
  const rangeStart = new Date();
  if (timeframe === "7d") rangeStart.setDate(now.getDate() - 7);
  else if (timeframe === "30d") rangeStart.setDate(now.getDate() - 30);
  else if (timeframe === "90d") rangeStart.setDate(now.getDate() - 90);
  else if (timeframe === "6m") rangeStart.setMonth(now.getMonth() - 6);
  else if (timeframe === "1y") rangeStart.setFullYear(now.getFullYear() - 1);
  else rangeStart.setFullYear(2020);

  // 1. Fetch All Members & compute status
  const allMembers = await prisma.member.findMany({
    include: {
      subscriptions: { orderBy: { dueDate: "desc" }, take: 1 },
    },
  });

  let activeCount = 0;
  let expiredCount = 0;
  let dueSoonCount = 0;
  let inactiveCount = 0;

  for (const m of allMembers) {
    const latest = m.subscriptions[0];
    if (!m.isActive) {
      inactiveCount++;
    } else if (!latest) {
      inactiveCount++;
    } else if (latest.dueDate < now) {
      expiredCount++;
    } else if (latest.dueDate <= threeDaysFromNow) {
      dueSoonCount++;
    } else {
      activeCount++;
    }
  }

  // 2. Fetch All Payments
  const allPayments = await prisma.payment.findMany({
    orderBy: { paidAt: "asc" },
    include: {
      member: { select: { fullName: true, memberCode: true } },
      subscription: { select: { planMonths: true } },
    },
  });

  // 3. Fetch All Attendances
  const allAttendances = await prisma.attendance.findMany({
    orderBy: { date: "asc" },
    select: { id: true, date: true, checkInTime: true, method: true },
  });

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
  const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
  const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  let totalRevenue = 0;
  let thisMonthRevenue = 0;
  let lastMonthRevenue = 0;

  const paymentMethodStats: Record<string, { count: number; amount: number }> = {};
  const planDistribution: Record<number, number> = { 1: 0, 3: 0, 6: 0, 12: 0 };

  for (const p of allPayments) {
    const amt = Number(p.amount);
    totalRevenue += amt;

    if (p.paidAt >= startOfCurrentMonth) {
      thisMonthRevenue += amt;
    } else if (p.paidAt >= startOfLastMonth && p.paidAt <= endOfLastMonth) {
      lastMonthRevenue += amt;
    }

    // Payment method distribution
    if (!paymentMethodStats[p.method]) {
      paymentMethodStats[p.method] = { count: 0, amount: 0 };
    }
    paymentMethodStats[p.method].count += 1;
    paymentMethodStats[p.method].amount += amt;

    // Plan duration stats
    if (p.subscription?.planMonths) {
      planDistribution[p.subscription.planMonths] = (planDistribution[p.subscription.planMonths] || 0) + 1;
    }
  }

  const revenueGrowthRate =
    lastMonthRevenue > 0
      ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
      : thisMonthRevenue > 0
      ? 100
      : 0;

  const arpm = activeCount > 0 ? Math.round(thisMonthRevenue / (activeCount + dueSoonCount)) : 0;

  // 4. Comprehensive All-Months Historical Timeline
  // Find earliest recorded event
  let earliestDate = new Date(currentYear, currentMonth - 11, 1); // default at least 12 months
  if (allPayments.length > 0 && allPayments[0].paidAt < earliestDate) {
    earliestDate = new Date(allPayments[0].paidAt.getFullYear(), allPayments[0].paidAt.getMonth(), 1);
  }
  if (allMembers.length > 0) {
    for (const m of allMembers) {
      const d = m.joiningDate || m.createdAt;
      if (d < earliestDate) {
        earliestDate = new Date(d.getFullYear(), d.getMonth(), 1);
      }
    }
  }

  const allMonthlyStats: HistoricalMonthlyStat[] = [];
  let iter = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
  const stopIter = new Date(currentYear, currentMonth, 1);

  let prevMonthRev = 0;
  let prevMonthAtt = 0;

  while (iter <= stopIter) {
    const y = iter.getFullYear();
    const m = iter.getMonth() + 1;
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const label = iter.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59, 999);
    const daysInMonth = new Date(y, m, 0).getDate();

    // Payments in this month
    const monthPayments = allPayments.filter((p) => p.paidAt >= monthStart && p.paidAt <= monthEnd);
    const monthRev = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const mMethods: Record<string, { count: number; amount: number }> = {};
    for (const p of monthPayments) {
      if (!mMethods[p.method]) mMethods[p.method] = { count: 0, amount: 0 };
      mMethods[p.method].count += 1;
      mMethods[p.method].amount += Number(p.amount);
    }

    // New Members onboarded in this month
    const monthNewMembers = allMembers.filter((mem) => {
      const j = mem.joiningDate || mem.createdAt;
      return j >= monthStart && j <= monthEnd;
    }).length;

    // Attendance check-ins in this month
    const monthAtts = allAttendances.filter((a) => a.date >= monthStart && a.date <= monthEnd);
    const attCount = monthAtts.length;
    const avgDailyAtt = Math.round((attCount / daysInMonth) * 10) / 10;

    const revGrowth =
      prevMonthRev > 0
        ? Math.round(((monthRev - prevMonthRev) / prevMonthRev) * 100)
        : monthRev > 0 && allMonthlyStats.length > 0
        ? 100
        : 0;

    const attGrowth =
      prevMonthAtt > 0
        ? Math.round(((attCount - prevMonthAtt) / prevMonthAtt) * 100)
        : attCount > 0 && allMonthlyStats.length > 0
        ? 100
        : 0;

    allMonthlyStats.push({
      monthKey,
      label,
      year: y,
      month: m,
      revenue: monthRev,
      paymentsCount: monthPayments.length,
      newMembers: monthNewMembers,
      attendanceCount: attCount,
      avgDailyAttendance: avgDailyAtt,
      revenueGrowthVsPrev: revGrowth,
      attendanceGrowthVsPrev: attGrowth,
      paymentMethods: Object.entries(mMethods).map(([method, val]) => ({
        method,
        count: val.count,
        amount: val.amount,
      })),
    });

    prevMonthRev = monthRev;
    prevMonthAtt = attCount;
    iter.setMonth(iter.getMonth() + 1);
  }

  // 5. Recent Attendance & Daily Distribution
  const recentAttendances = allAttendances.filter((a) => a.date >= rangeStart);
  const todayAttendance = allAttendances.filter((a) => a.date.getTime() === todayStart.getTime());

  // Daily attendance trend for chart
  const dailyAttendanceMap = new Map<string, { dateLabel: string; total: number; qr: number; manual: number }>();
  const daysInRange = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 14;

  for (let i = daysInRange - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const dateLabel = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    dailyAttendanceMap.set(key, { dateLabel, total: 0, qr: 0, manual: 0 });
  }

  for (const att of recentAttendances) {
    const key = att.date.toISOString().split("T")[0];
    if (dailyAttendanceMap.has(key)) {
      const entry = dailyAttendanceMap.get(key)!;
      entry.total += 1;
      if (att.method === "QR") entry.qr += 1;
      else entry.manual += 1;
    }
  }

  // Day of week distribution (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];

  // Hourly distribution (6:00 to 22:00)
  const hourlyCounts: Record<number, number> = {};
  for (let h = 5; h <= 22; h++) hourlyCounts[h] = 0;

  for (const att of recentAttendances) {
    const day = new Date(att.checkInTime).getDay();
    dayOfWeekCounts[day] += 1;

    const hour = new Date(att.checkInTime).getHours();
    if (hourlyCounts[hour] !== undefined) {
      hourlyCounts[hour] += 1;
    }
  }

  const dayOfWeekDistribution = dayNames.map((name, idx) => ({
    day: name,
    count: dayOfWeekCounts[idx],
  }));

  const hourlyDistribution = Object.entries(hourlyCounts).map(([hour, count]) => {
    const h = parseInt(hour, 10);
    const period = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    return {
      hour: `${displayHour} ${period}`,
      rawHour: h,
      count,
    };
  });

  const paymentMethodsArray = Object.entries(paymentMethodStats).map(([method, data]) => ({
    method,
    count: data.count,
    amount: data.amount,
    percentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 100) : 0,
  }));

  const avgNewMembersPerMonth =
    allMonthlyStats.length > 0
      ? Math.round(allMonthlyStats.reduce((sum, m) => sum + m.newMembers, 0) / allMonthlyStats.length)
      : 0;

  const totalDays = dailyAttendanceMap.size || 1;
  const avgDailyAttendance = Math.round(recentAttendances.length / totalDays);

  return {
    kpis: {
      totalMembers: allMembers.length,
      activeMembers: activeCount,
      dueSoonMembers: dueSoonCount,
      expiredMembers: expiredCount,
      inactiveMembers: inactiveCount,
      retentionRate: allMembers.length > 0 ? Math.round((activeCount / allMembers.length) * 100) : 0,
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      revenueGrowthRate,
      arpm,
      todayAttendanceCount: todayAttendance.length,
      avgDailyAttendance,
      avgNewMembersPerMonth,
    },
    allMonthlyStats: [...allMonthlyStats].reverse(), // newest first
    monthlyTrends: allMonthlyStats.slice(-6).map((m) => ({
      monthKey: m.monthKey,
      label: m.label,
      revenue: m.revenue,
      paymentsCount: m.paymentsCount,
      newMembers: m.newMembers,
    })),
    dailyAttendance: Array.from(dailyAttendanceMap.values()),
    dayOfWeekDistribution,
    hourlyDistribution,
    paymentMethods: paymentMethodsArray,
    planDistribution: Object.entries(planDistribution).map(([months, count]) => ({
      plan: `${months} Month${Number(months) > 1 ? "s" : ""}`,
      planMonths: Number(months),
      count,
    })),
    recentPayments: allPayments
      .slice(-5)
      .reverse()
      .map((p) => ({
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        amount: Number(p.amount),
        method: p.method,
        paidAt: p.paidAt.toISOString(),
        invoiceUrl: p.invoiceUrl,
        member: {
          fullName: p.member.fullName,
          memberCode: p.member.memberCode,
        },
        subscription: p.subscription
          ? {
              planMonths: p.subscription.planMonths,
            }
          : null,
      })),
    auditLogs: (
      await prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      })
    ).map((log) => ({
      id: log.id,
      action: log.action,
      category: log.category,
      actorName: log.actorName,
      actorRole: log.actorRole,
      targetName: log.targetName,
      details: log.details,
      ipAddress: log.ipAddress,
      createdAt: log.createdAt.toISOString(),
    })),
  };
}
