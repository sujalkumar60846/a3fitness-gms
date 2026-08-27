"use client";

import { useState } from "react";
import { Flame, Trophy, Calendar, Zap, TrendingUp, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MemberAttendanceAnalytics, MonthAttendanceSummary } from "@/app/actions/attendance.actions";

interface MemberAttendanceInsightsProps {
  analytics: MemberAttendanceAnalytics;
  memberName?: string;
  isStaffView?: boolean;
}

export function MemberAttendanceInsights({
  analytics,
  memberName,
  isStaffView = false,
}: MemberAttendanceInsightsProps) {
  const { totalCheckIns, currentStreak, longestStreak, monthlyAverage, bestMonth, months } = analytics;

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(
    months.length > 0 ? months[0].monthKey : ""
  );

  const selectedMonth: MonthAttendanceSummary | undefined =
    months.find((m) => m.monthKey === selectedMonthKey) || months[0];

  // Helper to build the calendar grid for the selected month
  const renderMonthCalendar = (monthSummary?: MonthAttendanceSummary) => {
    if (!monthSummary) {
      return <p className="text-sm text-zinc-500 py-6 text-center">No attendance data recorded yet.</p>;
    }

    const { year, month, daysInMonth, attendedDays, attendances } = monthSummary;
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0 = Sun, 1 = Mon ...
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Build empty padding cells before day 1
    const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Map attended day to details
    const attMap = new Map<number, { checkInTime: string; method: "QR" | "MANUAL" }>();
    for (const a of attendances) {
      attMap.set(a.day, { checkInTime: a.checkInTime, method: a.method });
    }

    return (
      <div className="space-y-4">
        {/* Month selector header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-zinc-900">{monthSummary.label}</h3>
            <p className="text-xs text-zinc-500">
              {monthSummary.attendedCount} of {monthSummary.daysInMonth} days attended ({monthSummary.percentage}% consistency)
            </p>
          </div>

          {/* Month selector dropdown for many months */}
          <div className="flex items-center gap-2">
            <select
              value={selectedMonthKey}
              onChange={(e) => setSelectedMonthKey(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm focus:border-zinc-900 focus:outline-none"
            >
              {months.map((m) => (
                <option key={m.monthKey} value={m.monthKey}>
                  {m.label} ({m.attendedCount} days)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs">
          {weekdays.map((w) => (
            <div key={w} className="py-1 text-[11px] font-semibold text-zinc-400">
              {w}
            </div>
          ))}

          {blanks.map((b) => (
            <div key={`blank-${b}`} className="h-9 sm:h-11 rounded-lg bg-zinc-50/50" />
          ))}

          {days.map((day) => {
            const isAttended = attendedDays.includes(day);
            const detail = attMap.get(day);

            return (
              <div
                key={`day-${day}`}
                title={isAttended ? `Attended on Day ${day} at ${detail?.checkInTime} (${detail?.method})` : `Day ${day}`}
                className={`relative flex h-9 sm:h-11 flex-col items-center justify-center rounded-lg border transition-all ${
                  isAttended
                    ? "border-emerald-300 bg-emerald-50 text-emerald-950 font-bold shadow-xs hover:border-emerald-400"
                    : "border-zinc-100 bg-white text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                <span className="text-xs sm:text-sm">{day}</span>
                {isAttended && (
                  <span className="flex items-center gap-0.5 text-[9px] text-emerald-600 font-medium">
                    <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                    <span className="hidden sm:inline text-[9px]">{detail?.checkInTime}</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 pt-2 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Attended Day
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm border border-zinc-200 bg-white" /> Rest / Missed
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards: Streaks & Consistency */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {/* 1. Current Streak */}
        <Card className="relative overflow-hidden border-orange-200 bg-gradient-to-br from-orange-50/60 to-amber-50/40">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-700">Current Streak</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                <Flame className="h-4 w-4 fill-orange-500 text-orange-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-orange-950">{currentStreak}</span>
              <span className="text-xs font-medium text-orange-700">day{currentStreak === 1 ? "" : "s"}</span>
            </div>
            <p className="mt-1 text-[11px] text-orange-800/80">
              {currentStreak > 0 ? "🔥 Streak is active!" : "Check in today to start a streak"}
            </p>
          </CardContent>
        </Card>

        {/* 2. Longest Streak */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-yellow-50/30">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-800">Best Streak</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <Trophy className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-950">{longestStreak}</span>
              <span className="text-xs font-medium text-amber-800">day{longestStreak === 1 ? "" : "s"}</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-800/80">Personal best record</p>
          </CardContent>
        </Card>

        {/* 3. Total Workouts */}
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-teal-50/30">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Total Workouts</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <Calendar className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-950">{totalCheckIns}</span>
              <span className="text-xs font-medium text-emerald-800">sessions</span>
            </div>
            <p className="mt-1 text-[11px] text-emerald-800/80">Lifetime gym check-ins</p>
          </CardContent>
        </Card>

        {/* 4. Monthly Average */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/30">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-800">Monthly Avg</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-blue-950">{monthlyAverage}</span>
              <span className="text-xs font-medium text-blue-800">days/mo</span>
            </div>
            <p className="mt-1 truncate text-[11px] text-blue-800/80">
              {bestMonth ? `Best: ${bestMonth.label} (${bestMonth.count}d)` : "Across all active months"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Month-by-Month View */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Interactive Calendar */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Zap className="h-4 w-4 text-amber-500" /> Monthly Attendance Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>{renderMonthCalendar(selectedMonth)}</CardContent>
        </Card>

        {/* Right Col: All Months History Bar Timeline */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <TrendingUp className="h-4 w-4 text-blue-600" /> All-Time Monthly Records
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {months.length === 0 ? (
              <p className="py-6 text-center text-xs text-zinc-500">No monthly history yet.</p>
            ) : (
              <div className="max-h-[340px] space-y-2.5 overflow-y-auto pr-1">
                {months.map((m) => {
                  const isSelected = m.monthKey === selectedMonthKey;
                  return (
                    <button
                      key={m.monthKey}
                      onClick={() => setSelectedMonthKey(m.monthKey)}
                      className={`w-full rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? "border-zinc-900 bg-zinc-900 text-white shadow-xs"
                          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50 text-zinc-900"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span>{m.label}</span>
                        <span className={isSelected ? "text-emerald-300" : "text-emerald-600"}>
                          {m.attendedCount} / {m.daysInMonth} days
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full rounded-full ${isSelected ? "bg-emerald-400" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, m.percentage)}%` }}
                        />
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] opacity-75">
                        <span>Consistency Rate</span>
                        <span>{m.percentage}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
