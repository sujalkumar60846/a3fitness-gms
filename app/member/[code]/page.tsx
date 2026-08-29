import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { Calendar, Receipt, ClipboardCheck, ArrowLeft, Clock } from "lucide-react";
import { getMemberDashboardByCode } from "@/app/actions/member-public.actions";
import { getMemberAttendanceStats } from "@/app/actions/attendance.actions";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils/formatters";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { toCalendarDate } from "@/lib/utils/generators";
import { MemberStatusBadge } from "@/components/shared/member-status-badge";
import { MemberAttendanceInsights } from "@/components/dashboard/member-attendance-insights";
import { OnlineRenewalCard } from "./online-renewal-card";
import { MemberProfileCard } from "./member-profile-card";
import { MemberAttendanceButton } from "./member-attendance-button";
import { MemberLogoutButton } from "./member-logout-button";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Mirrors the derivation logic used everywhere else — status is always computed, never stored. */
function computeStatus(subscriptions: { dueDate: Date; status: string }[], isActive: boolean): string {
  if (!isActive) return "INACTIVE";
  const latest = subscriptions[0];
  if (!latest) return "INACTIVE";
  const now = new Date();
  const soon = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  if (latest.dueDate < now) return "EXPIRED";
  if (latest.dueDate <= soon) return "DUE_SOON";
  return "ACTIVE";
}

export default async function MemberDashboardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const headersList = await headers();
  const ip = getClientIp(headersList);
  const limited = await rateLimit(`member-lookup:${ip}`);

  if (!limited.success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-50 px-4 text-center">
        <Clock className="h-8 w-8 text-zinc-400" />
        <p className="text-sm text-zinc-600">Too many lookups. Please wait a moment and try again.</p>
        <Link href="/member" className="text-xs text-zinc-500 underline underline-offset-2">
          Back
        </Link>
      </div>
    );
  }

  const member = await getMemberDashboardByCode(code);
  if (!member) notFound();

  const [gymSettings, attendanceAnalytics] = await Promise.all([
    prisma.gymSettings.findUnique({ where: { id: "singleton" } }),
    getMemberAttendanceStats(member.id),
  ]);
  const defaultPricing = (gymSettings?.defaultPricing as Record<string, number>) || {};

  const status = computeStatus(member.subscriptions, member.isActive);
  const latestSub = member.subscriptions[0];
  const isExpired = status === "EXPIRED" || status === "DUE_SOON";

  // Check today attendance
  const today = toCalendarDate();
  const todayAttendance = member.attendances.find((a) => {
    const d = new Date(a.date);
    return d.toISOString().slice(0, 10) === today.toISOString().slice(0, 10);
  });
  const hasAttendedToday = Boolean(todayAttendance);
  const todayCheckInTime = todayAttendance
    ? new Date(todayAttendance.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : undefined;

  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-zinc-50 px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/member" className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900">
          <ArrowLeft className="h-3.5 w-3.5" /> Switch Account
        </Link>
        <MemberLogoutButton />
      </div>

      {/* Header: Left column with Member details, Right corner with Member Photo & Touch modal */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 text-left">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900">{member.fullName}</h1>
            <p className="text-xs font-mono font-semibold text-zinc-500">{member.memberCode}</p>
            <p className="text-xs text-zinc-400 mt-1">
              Member Since: <span className="font-medium text-zinc-700">{fmtDate(member.joiningDate)}</span>
            </p>
            {member.email && (
              <p className="text-xs text-zinc-500">
                Gmail: <span className="font-medium text-zinc-700">{member.email}</span>
              </p>
            )}
            <div className="pt-2">
              <MemberStatusBadge status={status} />
            </div>
          </div>

          {/* Right Corner Photo with Touch to view/edit details & update photo/gmail */}
          <div className="shrink-0">
            <MemberProfileCard
              member={{
                fullName: member.fullName,
                memberCode: member.memberCode,
                photoUrl: member.photoUrl,
                email: member.email,
                phone: member.phone,
                gender: member.gender,
                joiningDate: member.joiningDate,
                isActive: member.isActive,
              }}
              allowPhotoUpdate={gymSettings?.allowMemberPhotoUpdate ?? true}
              allowEmailUpdate={gymSettings?.allowMemberEmailUpdate ?? true}
            />
          </div>
        </div>
      </div>

      {/* Daily Attendance Action Button */}
      <section className="mt-6">
        <MemberAttendanceButton
          memberCode={member.memberCode}
          hasAttendedToday={hasAttendedToday}
          todayCheckInTime={todayCheckInTime}
        />
      </section>

      {/* Online Renewal Card / Coming Soon */}
      <section className="mt-6">
        {gymSettings?.allowOnlineRenewals ? (
          <OnlineRenewalCard
            memberCode={member.memberCode}
            memberName={member.fullName}
            isExpired={isExpired}
            defaultPricing={defaultPricing}
          />
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="mt-2 text-sm font-semibold text-zinc-900">Online Renewals Coming Soon</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Online member renewals via UPI, Card, and Netbanking will be available soon. Please visit the gym reception desk to renew your membership.
            </p>
          </div>
        )}
      </section>

      {/* Plan validity */}
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Calendar className="h-4 w-4 text-zinc-600" /> Plan Validity
        </h2>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
          {latestSub ? (
            <>
              <p className="font-medium text-zinc-800">{latestSub.planMonths} month plan</p>
              <p className="mt-1 text-xs text-zinc-500">
                {fmtDate(latestSub.startDate)} → {fmtDate(latestSub.dueDate)}
              </p>
              {status === "EXPIRED" && (
                <p className="mt-2 text-xs font-medium text-rose-600">
                  Your plan has expired. Use the payment option above to renew immediately.
                </p>
              )}
              {status === "DUE_SOON" && (
                <p className="mt-2 text-xs font-medium text-amber-600">
                  Your plan is expiring soon. Renew online to avoid interruption.
                </p>
              )}
            </>
          ) : (
            <p className="text-zinc-500">No active plan on record.</p>
          )}
        </div>
      </section>

      {/* Payment receipts */}
      <section className="mt-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Receipt className="h-4 w-4 text-zinc-600" /> Payment Receipts
        </h2>
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {member.payments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">No payments on record yet.</p>
          ) : (
            member.payments.map((p) => {
              const invoiceDownloadUrl = `/api/invoices/${p.invoiceNumber}/download`;
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-zinc-900">{formatCurrency(p.amount.toString())}</p>
                    <p className="text-xs text-zinc-500">
                      {p.invoiceNumber} · {fmtDate(p.paidAt)}
                    </p>
                  </div>
                  <a
                    href={invoiceDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
                  >
                    Download Invoice
                  </a>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Attendance & Streak Analytics */}
      <section className="mt-6 pb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <ClipboardCheck className="h-4 w-4 text-zinc-600" /> Attendance History, Streaks & Monthly Calendar
        </h2>
        <MemberAttendanceInsights
          analytics={attendanceAnalytics}
          memberName={member.fullName}
          isStaffView={false}
        />
      </section>
    </div>
  );
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}