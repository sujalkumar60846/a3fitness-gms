import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone, Mail, ShieldAlert, Calendar, Wallet, ClipboardCheck, Receipt, Download } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { getMemberById } from "@/app/actions/member.actions";
import { getMemberPaymentHistory } from "@/app/actions/payment.actions";
import { getMemberAttendanceStats } from "@/app/actions/attendance.actions";
import { formatCurrency } from "@/lib/utils/formatters";
import { MemberStatusBadge } from "@/components/shared/member-status-badge";
import { DeleteMemberButton } from "@/components/dashboard/delete-member-button";
import { FreezeMemberButton } from "@/components/dashboard/freeze-member-button";
import { EditMemberDialog } from "@/components/dashboard/edit-member-dialog";
import { SendDueReminderButton } from "@/components/dashboard/send-due-reminder-button";
import { ResendReceiptButton } from "@/components/dashboard/resend-receipt-button";
import { MemberAttendanceInsights } from "@/components/dashboard/member-attendance-insights";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Mirrors the derivation logic in listMembers() — status is computed, never stored. */
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

export default async function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) return null;

  const member = await getMemberById(id);
  if (!member) notFound();

  const [payments, attendanceAnalytics] = await Promise.all([
    getMemberPaymentHistory(id),
    getMemberAttendanceStats(id),
  ]);

  const status = computeStatus(member.subscriptions, member.isActive);
  const canDelete = hasRole(session.role, ["SUPER_ADMIN", "ADMIN"]);
  const isDue = status === "DUE_SOON" || status === "EXPIRED";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt={member.fullName} className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-zinc-100 text-xl font-semibold text-zinc-500">
              {member.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-zinc-900">{member.fullName}</h1>
              <MemberStatusBadge status={status} />
            </div>
            <p className="text-sm font-mono font-medium text-zinc-500">{member.memberCode}</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Member Since: <span className="font-medium text-zinc-600">{fmtDate(member.joiningDate)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href={`/dashboard/payments/new?memberId=${member.id}`}>
              <Wallet className="mr-1.5 h-3.5 w-3.5" /> Record payment
            </Link>
          </Button>
          <SendDueReminderButton
            memberId={member.id}
            memberName={member.fullName}
            isDue={isDue}
          />
          <EditMemberDialog
            member={{
              id: member.id,
              fullName: member.fullName,
              email: member.email,
              phone: member.phone,
              emergencyContact: member.emergencyContact,
              joiningDate: member.joiningDate,
              photoUrl: member.photoUrl,
            }}
          />
          <FreezeMemberButton
            memberId={member.id}
            memberName={member.fullName}
            isActive={member.isActive}
          />
          {canDelete && <DeleteMemberButton memberId={member.id} memberName={member.fullName} />}
        </div>
      </div>

      {/* Contact info */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Contact Details</p>
            <p className="flex items-center gap-2 text-zinc-700">
              <Phone className="h-3.5 w-3.5 text-zinc-400" /> {member.phone}
            </p>
            {member.email && (
              <p className="flex items-center gap-2 text-zinc-700">
                <Mail className="h-3.5 w-3.5 text-zinc-400" /> {member.email}
              </p>
            )}
            <p className="flex items-center gap-2 text-zinc-700">
              <ShieldAlert className="h-3.5 w-3.5 text-zinc-400" /> Emergency: {member.emergencyContact}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400">Membership Details</p>
            <p className="text-zinc-700">
              <span className="text-zinc-400">Member Since:</span> <strong>{fmtDate(member.joiningDate)}</strong>
            </p>
            <p className="text-zinc-700">
              <span className="text-zinc-400">System Onboarded:</span> {fmtDate(member.createdAt)}
            </p>
            <p className="text-zinc-700">
              <span className="text-zinc-400">Registered by:</span> {member.registeredBy.name}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan / subscription history */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Calendar className="h-4 w-4" /> Plan History
        </h2>
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {member.subscriptions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">No plan on record yet.</p>
          ) : (
            member.subscriptions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-zinc-900">{s.planMonths} month plan</p>
                  <p className="text-xs text-zinc-500">
                    {fmtDate(s.startDate)} → {fmtDate(s.dueDate)}
                  </p>
                </div>
                <span className="text-xs font-medium text-zinc-500">{s.status}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Payment history */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Receipt className="h-4 w-4" /> Payment History & Receipts
        </h2>
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {payments.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">No payments recorded yet.</p>
          ) : (
            payments.map((p) => {
              const invoiceDownloadUrl = `/api/invoices/${p.invoiceNumber}/download`;
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-zinc-900">{formatCurrency(p.amount.toString())}</p>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                        {p.method === "ONLINE_RAZORPAY" ? "Online (Razorpay)" : p.method}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {p.invoiceNumber} · {fmtDate(p.paidAt)} · {p.collectedBy ? `collected by ${p.collectedBy.name}` : "Member Online Payment"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={invoiceDownloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
                    >
                      <Download className="h-3 w-3" /> Invoice PDF
                    </a>
                    <ResendReceiptButton paymentId={p.id} invoiceNumber={p.invoiceNumber} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Attendance & Streak Analytics */}
      <section className="mt-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <ClipboardCheck className="h-4 w-4" /> Attendance Analytics, Streaks & Monthly Records
        </h2>
        <MemberAttendanceInsights
          analytics={attendanceAnalytics}
          memberName={member.fullName}
          isStaffView={true}
        />
      </section>
    </div>
  );
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
