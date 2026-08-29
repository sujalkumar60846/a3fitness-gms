"use client";

import { useState } from "react";
import {
  TrendingUp,
  Users,
  Calendar,
  Wallet,
  Clock,
  Activity,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  CalendarRange,
  ChevronRight,
  Layers,
  ShieldCheck,
  KeyRound,
  Search,
  Filter,
  Shield,
  Lock,
  FileText,
  CheckCircle2,
  History,
  Settings as SettingsIcon,
  Mail,
  UserCog,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HistoricalMonthlyStat } from "@/app/actions/analytics.actions";

type AnalyticsData = {
  kpis: {
    totalMembers: number;
    activeMembers: number;
    dueSoonMembers: number;
    expiredMembers: number;
    inactiveMembers: number;
    retentionRate: number;
    totalRevenue: number;
    thisMonthRevenue: number;
    lastMonthRevenue: number;
    revenueGrowthRate: number;
    arpm: number;
    todayAttendanceCount: number;
    avgDailyAttendance: number;
    avgNewMembersPerMonth: number;
  };
  allMonthlyStats: HistoricalMonthlyStat[];
  monthlyTrends: {
    monthKey: string;
    label: string;
    revenue: number;
    paymentsCount: number;
    newMembers: number;
  }[];
  dailyAttendance: {
    dateLabel: string;
    total: number;
    qr: number;
    manual: number;
  }[];
  dayOfWeekDistribution: {
    day: string;
    count: number;
  }[];
  hourlyDistribution: {
    hour: string;
    rawHour: number;
    count: number;
  }[];
  paymentMethods: {
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }[];
  planDistribution: {
    plan: string;
    planMonths: number;
    count: number;
  }[];
  recentPayments: any[];
  auditLogs?: {
    id: string;
    action: string;
    category: string;
    actorName: string;
    actorRole: string | null;
    targetName: string | null;
    details: string;
    ipAddress: string | null;
    createdAt: string;
  }[];
};

export function AnalyticsDashboardView({
  initialData,
  currentUserRole,
}: {
  initialData: AnalyticsData;
  currentUserRole?: string;
}) {
  const [data] = useState<AnalyticsData>(initialData);
  const [activeTab, setActiveTab] = useState<
    "overview" | "all_months" | "revenue" | "attendance" | "members" | "audit_logs"
  >("overview");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditCategory, setAuditCategory] = useState("ALL");

  const {
    kpis,
    allMonthlyStats,
    monthlyTrends,
    dailyAttendance,
    dayOfWeekDistribution,
    hourlyDistribution,
    paymentMethods,
    planDistribution,
    auditLogs = [],
  } = data;

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    allMonthlyStats && allMonthlyStats.length > 0 ? allMonthlyStats[0].monthKey : ""
  );

  const selectedMonth = allMonthlyStats.find((m) => m.monthKey === selectedMonthKey) || allMonthlyStats[0];

  // Max calculations for normalized chart scaling
  const maxMonthlyRevenue = Math.max(...monthlyTrends.map((m) => m.revenue), 1000);
  const maxDailyAttendance = Math.max(...dailyAttendance.map((d) => d.total), 1);
  const maxHourlyCount = Math.max(...hourlyDistribution.map((h) => h.count), 1);
  const maxDayOfWeek = Math.max(...dayOfWeekDistribution.map((d) => d.count), 1);
  const totalPlanMembers = planDistribution.reduce((sum, p) => sum + p.count, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Top Tab Bar - Fully responsive scrolling on mobile */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
        <div className="flex w-full overflow-x-auto rounded-xl bg-zinc-100 p-1 no-scrollbar sm:w-auto">
          {(
            [
              { id: "overview", label: "Overview", icon: Layers },
              { id: "all_months", label: "All Months Explorer", icon: CalendarRange },
              { id: "revenue", label: "Revenue & Billing", icon: Wallet },
              { id: "attendance", label: "Attendance & Traffic", icon: Activity },
              { id: "members", label: "Acquisitions", icon: Users },
              { id: "audit_logs", label: "Activity & Audit Logs", icon: ShieldCheck },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.id === "audit_logs" && auditLogs.length > 0 && (
                  <span className="ml-1 rounded-full bg-zinc-900 px-1.5 py-0.2 text-[9px] text-white">
                    {auditLogs.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {/* Total Active Members */}
        <Card className="shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Members</span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold text-zinc-900">{kpis.activeMembers}</span>
              <span className="inline-flex items-center text-[11px] font-medium text-emerald-600">
                {kpis.retentionRate}%
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 truncate">
              {kpis.dueSoonMembers} due soon · {kpis.expiredMembers} expired
            </p>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card className="shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">This Month</span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold text-zinc-900">{formatCurrency(kpis.thisMonthRevenue)}</span>
              <span
                className={`inline-flex items-center text-[11px] font-medium ${
                  kpis.revenueGrowthRate >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {kpis.revenueGrowthRate >= 0 ? (
                  <ArrowUpRight className="mr-0.5 h-3 w-3" />
                ) : (
                  <ArrowDownRight className="mr-0.5 h-3 w-3" />
                )}
                {kpis.revenueGrowthRate >= 0 ? `+${kpis.revenueGrowthRate}%` : `${kpis.revenueGrowthRate}%`}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 truncate">
              Last month: {formatCurrency(kpis.lastMonthRevenue)}
            </p>
          </CardContent>
        </Card>

        {/* Avg Daily Attendance */}
        <Card className="shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">Daily Traffic</span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold text-zinc-900">{kpis.avgDailyAttendance}</span>
              <span className="text-[11px] text-zinc-500">Today: {kpis.todayAttendanceCount}</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 truncate">Average check-ins / day</p>
          </CardContent>
        </Card>

        {/* Total Lifetime Revenue */}
        <Card className="shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Revenue</span>
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <Percent className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
              <span className="text-xl sm:text-2xl font-bold text-zinc-900">{formatCurrency(kpis.totalRevenue)}</span>
              <span className="text-[11px] font-medium text-purple-600">~{kpis.avgNewMembersPerMonth} signups/mo</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500 truncate">ARPM: {formatCurrency(kpis.arpm)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ALL MONTHS HISTORICAL EXPLORER TAB */}
      {activeTab === "all_months" && (
        <div className="space-y-6">
          {/* Selected Month Header & Selector */}
          <Card className="border-zinc-200 bg-white">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-zinc-700" /> Historical Monthly Analytics
                </CardTitle>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select any past month to view exact revenue, attendance, transactions, and acquisition metrics.
                </p>
              </div>

              {/* Month Selector Dropdown */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonthKey}
                  onChange={(e) => setSelectedMonthKey(e.target.value)}
                  className="w-full sm:w-auto rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-800 shadow-xs focus:border-zinc-900 focus:outline-none"
                >
                  {allMonthlyStats.map((m) => (
                    <option key={m.monthKey} value={m.monthKey}>
                      {m.label} — {formatCurrency(m.revenue)} ({m.attendanceCount} check-ins)
                    </option>
                  ))}
                </select>
              </div>
            </CardHeader>

            {selectedMonth && (
              <CardContent className="space-y-6 pt-2">
                {/* 4 Detailed KPIs for the Selected Month */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <p className="text-[11px] font-semibold uppercase text-emerald-800">Month Revenue</p>
                    <p className="mt-1 text-xl font-bold text-emerald-950">{formatCurrency(selectedMonth.revenue)}</p>
                    <p className="mt-1 text-[11px] text-emerald-700">
                      {selectedMonth.revenueGrowthVsPrev >= 0 ? `+${selectedMonth.revenueGrowthVsPrev}%` : `${selectedMonth.revenueGrowthVsPrev}%`} vs prior month
                    </p>
                  </div>

                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <p className="text-[11px] font-semibold uppercase text-blue-800">Total Check-ins</p>
                    <p className="mt-1 text-xl font-bold text-blue-950">{selectedMonth.attendanceCount}</p>
                    <p className="mt-1 text-[11px] text-blue-700">
                      ~{selectedMonth.avgDailyAttendance} check-ins/day
                    </p>
                  </div>

                  <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
                    <p className="text-[11px] font-semibold uppercase text-purple-800">New Members</p>
                    <p className="mt-1 text-xl font-bold text-purple-950">{selectedMonth.newMembers}</p>
                    <p className="mt-1 text-[11px] text-purple-700">Onboarded in {selectedMonth.label}</p>
                  </div>

                  <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                    <p className="text-[11px] font-semibold uppercase text-amber-800">Paid Invoices</p>
                    <p className="mt-1 text-xl font-bold text-amber-950">{selectedMonth.paymentsCount}</p>
                    <p className="mt-1 text-[11px] text-amber-700">Transactions processed</p>
                  </div>
                </div>

                {/* Selected Month Payment Methods */}
                {selectedMonth.paymentMethods && selectedMonth.paymentMethods.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                      Payment Modes for {selectedMonth.label}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {selectedMonth.paymentMethods.map((pm) => (
                        <div key={pm.method} className="rounded-lg border border-zinc-100 bg-zinc-50 p-2.5 text-xs">
                          <p className="font-medium text-zinc-600">{pm.method}</p>
                          <p className="font-bold text-zinc-900">{formatCurrency(pm.amount)}</p>
                          <p className="text-[10px] text-zinc-400">{pm.count} payment{pm.count === 1 ? "" : "s"}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Master Table of All Months */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-zinc-900">
                All Months Historical Performance Table
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-y border-zinc-200 bg-zinc-50 font-semibold text-zinc-600">
                    <tr>
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Invoices</th>
                      <th className="px-4 py-3 text-right">New Members</th>
                      <th className="px-4 py-3 text-right">Total Check-ins</th>
                      <th className="px-4 py-3 text-right">Avg Daily Traffic</th>
                      <th className="px-4 py-3 text-right">MoM Growth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {allMonthlyStats.map((m) => {
                      const isSelected = m.monthKey === selectedMonthKey;
                      return (
                        <tr
                          key={m.monthKey}
                          onClick={() => setSelectedMonthKey(m.monthKey)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? "bg-zinc-100 font-semibold text-zinc-900" : "hover:bg-zinc-50/80 text-zinc-700"
                          }`}
                        >
                          <td className="px-4 py-3 font-medium flex items-center gap-1.5">
                            {isSelected && <span className="h-2 w-2 rounded-full bg-zinc-900" />}
                            {m.label}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-zinc-900">
                            {formatCurrency(m.revenue)}
                          </td>
                          <td className="px-4 py-3 text-right">{m.paymentsCount}</td>
                          <td className="px-4 py-3 text-right">+{m.newMembers}</td>
                          <td className="px-4 py-3 text-right">{m.attendanceCount}</td>
                          <td className="px-4 py-3 text-right">{m.avgDailyAttendance} / day</td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`inline-flex items-center text-[11px] font-medium ${
                                m.revenueGrowthVsPrev >= 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {m.revenueGrowthVsPrev >= 0 ? `+${m.revenueGrowthVsPrev}%` : `${m.revenueGrowthVsPrev}%`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* OVERVIEW & REVENUE TAB */}
      {(activeTab === "overview" || activeTab === "revenue") && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Monthly Revenue Trend Bar Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-zinc-900 flex items-center justify-between">
                <span>Recent Monthly Trends</span>
                <span className="text-xs font-normal text-zinc-500">Revenue & Signups</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="h-64 flex items-end gap-2 sm:gap-3 pt-6 border-b border-zinc-200">
                {monthlyTrends.map((month) => {
                  const heightPercent = Math.max((month.revenue / maxMonthlyRevenue) * 100, 6);
                  return (
                    <div key={month.monthKey} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[11px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        <p className="font-semibold">{formatCurrency(month.revenue)}</p>
                        <p className="text-zinc-300">+{month.newMembers} members · {month.paymentsCount} payments</p>
                      </div>

                      {/* Bar */}
                      <div className="w-full max-w-[48px] flex flex-col items-center">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full rounded-t-md bg-zinc-900 group-hover:bg-blue-600 transition-colors relative"
                        >
                          {month.newMembers > 0 && (
                            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-600">
                              +{month.newMembers}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="mt-2 text-[11px] font-medium text-zinc-500 truncate w-full text-center">
                        {month.label.split(" ")[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-zinc-500">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-zinc-900"></span>
                  <span>Revenue Collected</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-600 font-bold">+N</span>
                  <span>New Member Registrations</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-zinc-900">Payment Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              {paymentMethods.length === 0 ? (
                <p className="text-sm text-zinc-500">No payment records found.</p>
              ) : (
                paymentMethods.map((pm) => (
                  <div key={pm.method} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-700">
                        {pm.method === "ONLINE_RAZORPAY" ? "Online (Razorpay)" : pm.method}
                      </span>
                      <span className="text-zinc-900">{formatCurrency(pm.amount)} ({pm.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className={`h-full rounded-full ${
                          pm.method === "ONLINE_RAZORPAY"
                            ? "bg-blue-600"
                            : pm.method === "UPI"
                            ? "bg-emerald-500"
                            : pm.method === "CASH"
                            ? "bg-amber-500"
                            : "bg-purple-500"
                        }`}
                        style={{ width: `${pm.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ATTENDANCE TAB */}
      {(activeTab === "overview" || activeTab === "attendance") && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Daily Attendance Trend */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-zinc-900 flex items-center justify-between">
                <span>Daily Attendance Traffic</span>
                <span className="text-xs font-normal text-zinc-500">QR vs Manual Check-ins</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="h-56 flex items-end gap-1 sm:gap-1.5 pt-6 border-b border-zinc-200">
                {dailyAttendance.map((day, idx) => {
                  const heightPercent = Math.max((day.total / maxDailyAttendance) * 100, 4);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative">
                      {/* Tooltip */}
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[10px] rounded px-2 py-1 pointer-events-none whitespace-nowrap z-10 shadow-lg">
                        <p className="font-semibold">{day.dateLabel}: {day.total} check-ins</p>
                        <p className="text-zinc-300">QR: {day.qr} · Manual: {day.manual}</p>
                      </div>

                      {/* Stacked bar */}
                      <div className="w-full flex flex-col items-center">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full rounded-t-sm bg-blue-600 group-hover:bg-blue-700 transition-colors"
                        ></div>
                      </div>
                      {idx % 5 === 0 && (
                        <span className="mt-2 text-[9px] font-medium text-zinc-400 truncate w-full text-center">
                          {day.dateLabel.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Peak Hours Heatmap */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-zinc-900 flex items-center gap-2">
                <Clock className="h-4 w-4 text-zinc-500" /> Peak Gym Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="space-y-2.5">
                {hourlyDistribution
                  .filter((h) => h.rawHour >= 6 && h.rawHour <= 21)
                  .map((h) => {
                    const pct = Math.max((h.count / maxHourlyCount) * 100, 4);
                    const isPeak = pct > 60;
                    return (
                      <div key={h.hour} className="flex items-center gap-3 text-xs">
                        <span className="w-14 shrink-0 text-zinc-500 font-mono text-[11px]">{h.hour}</span>
                        <div className="h-2.5 flex-1 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isPeak ? "bg-amber-500" : "bg-zinc-700"
                            }`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                        <span className="w-6 text-right font-medium text-zinc-700">{h.count}</span>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MEMBER GROWTH TAB */}
      {(activeTab === "overview" || activeTab === "members") && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Day of Week Attendance Traffic */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-zinc-900">Traffic by Day of the Week</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              <div className="h-44 flex items-end gap-3 pt-4 border-b border-zinc-200">
                {dayOfWeekDistribution.map((d) => {
                  const heightPercent = Math.max((d.count / maxDayOfWeek) * 100, 6);
                  return (
                    <div key={d.day} className="flex-1 flex flex-col items-center group relative">
                      <div className="w-full flex flex-col items-center">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full max-w-[36px] rounded-t bg-zinc-800 group-hover:bg-zinc-950 transition-colors"
                        ></div>
                      </div>
                      <span className="mt-2 text-xs font-medium text-zinc-600">{d.day}</span>
                      <span className="text-[10px] text-zinc-400">{d.count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Membership Plan Popularity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-zinc-900">Membership Plan Popularity</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-5 space-y-4">
              {planDistribution.map((p) => {
                const pct = Math.round((p.count / totalPlanMembers) * 100);
                return (
                  <div key={p.plan} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-zinc-700">{p.plan}</span>
                      <span className="text-zinc-900">{p.count} members ({pct}%)</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-900"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TAB: ACTIVITY & AUDIT LOGS (Super Admin / Admin Security & Changes)    */}
      {/* ========================================================================= */}
      {activeTab === "audit_logs" && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
                  <ShieldCheck className="h-5 w-5 text-zinc-900" /> System Activity & Audit Trail
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  Track permanent password overrides, gym branding modifications, staff management actions, and member self-service updates (photo uploads & Gmail links).
                </p>
              </div>
              <div className="rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-800">
                {auditLogs.length} Logged Event{auditLogs.length === 1 ? "" : "s"}
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="mt-5 flex flex-wrap items-center gap-3 pt-4 border-t border-zinc-100">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="Search by actor, target, or details..."
                  className="w-full rounded-xl border border-zinc-200 pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {[
                  { id: "ALL", label: "All Categories" },
                  { id: "SECURITY", label: "Security & Passwords" },
                  { id: "SETTINGS", label: "Gym Settings" },
                  { id: "MEMBER", label: "Member Activity" },
                  { id: "STAFF", label: "Staff Accounts" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setAuditCategory(cat.id)}
                    className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                      auditCategory === cat.id
                        ? "bg-zinc-900 text-white shadow-2xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Audit Events List */}
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden shadow-xs">
            {(() => {
              const filtered = auditLogs.filter((log) => {
                const matchesCat = auditCategory === "ALL" || log.category === auditCategory;
                const q = auditSearch.trim().toLowerCase();
                const matchesQuery =
                  !q ||
                  log.actorName.toLowerCase().includes(q) ||
                  (log.targetName && log.targetName.toLowerCase().includes(q)) ||
                  log.details.toLowerCase().includes(q) ||
                  log.action.toLowerCase().includes(q);
                return matchesCat && matchesQuery;
              });

              if (filtered.length === 0) {
                return (
                  <div className="p-12 text-center text-zinc-500">
                    <History className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
                    <p className="text-sm font-semibold text-zinc-700">No activity logs match this filter.</p>
                    <p className="text-xs text-zinc-400 mt-1">Events will appear automatically as settings, passwords, or member profiles are updated.</p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-zinc-100">
                  {filtered.map((log) => {
                    const date = new Date(log.createdAt);
                    const formattedDate = date.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });
                    const formattedTime = date.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    // Visual badge style by category
                    const categoryStyles: Record<string, { bg: string; text: string; border: string }> = {
                      SECURITY: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
                      SETTINGS: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
                      MEMBER: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
                      STAFF: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
                    };

                    const style = categoryStyles[log.category] || {
                      bg: "bg-zinc-50",
                      text: "text-zinc-700",
                      border: "border-zinc-200",
                    };

                    return (
                      <div key={log.id} className="p-4 sm:p-5 hover:bg-zinc-50/50 transition">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
                              >
                                {log.category}
                              </span>
                              <span className="text-xs font-semibold text-zinc-900">{log.action.replace(/_/g, " ")}</span>
                              {log.targetName && (
                                <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
                                  Target: {log.targetName}
                                </span>
                              )}
                            </div>

                            <p className="text-xs font-medium text-zinc-800 leading-relaxed">{log.details}</p>

                            <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                              <span>Actor: <strong className="text-zinc-600">{log.actorName}</strong> {log.actorRole && `(${log.actorRole})`}</span>
                              {log.ipAddress && <span>· IP: {log.ipAddress}</span>}
                            </div>
                          </div>

                          <div className="text-left sm:text-right shrink-0 text-xs text-zinc-500">
                            <div className="font-medium text-zinc-700">{formattedTime}</div>
                            <div className="text-[11px] text-zinc-400">{formattedDate}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
