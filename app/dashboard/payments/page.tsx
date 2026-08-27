import Link from "next/link";
import { Wallet, Search, TrendingUp, Download } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { listPayments } from "@/app/actions/payment.actions";
import { formatCurrency } from "@/lib/utils/formatters";
import { ResendReceiptButton } from "@/components/dashboard/resend-receipt-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function PaymentsPage() {
  const session = await getSession();
  if (!session) return null; // layout already redirects; satisfies TS

  const canViewReports = hasRole(session.role, ["SUPER_ADMIN", "ADMIN"]);

  if (!canViewReports) {
    // STAFF can RECORD payments (payment:record) but gym-wide financial
    // reports stay restricted to payment:view_reports (SUPER_ADMIN/ADMIN).
    // So Staff land on a lightweight "go record a payment" prompt instead
    // of the full transaction list.
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100">
          <Wallet className="h-6 w-6 text-zinc-600" />
        </div>
        <h1 className="text-xl font-semibold text-zinc-900">Record a Payment</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Search for a member to collect their fee and send a WhatsApp receipt.
        </p>
        <Button asChild className="mt-5">
          <Link href="/dashboard/payments/new">
            <Search className="mr-1.5 h-4 w-4" /> Find member
          </Link>
        </Button>
        <p className="mt-4 text-xs text-zinc-400">
          Gym-wide payment reports are visible to Admins and the Super Admin.
        </p>
      </div>
    );
  }

  const payments = await listPayments();
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Payments</h1>
          <p className="mt-1 text-sm text-zinc-500">{payments.length} transactions on record</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/payments/new">
            <Wallet className="mr-1.5 h-4 w-4" /> Record payment
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Total collected</p>
            <p className="text-xl font-semibold text-zinc-900">{formatCurrency(totalCollected)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {payments.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-zinc-500">No payments recorded yet.</p>
        ) : (
          payments.map((p) => (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{p.member.fullName}</p>
                <p className="text-xs text-zinc-500">
                  {p.invoiceNumber} · {p.member.memberCode} · {fmtDate(p.paidAt)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-1 sm:pt-0 border-t border-zinc-50 sm:border-0">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                  {p.method === "ONLINE_RAZORPAY" ? "Online" : p.method}
                </span>
                <span className="font-semibold text-zinc-900">{formatCurrency(p.amount.toString())}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={`/api/invoices/${p.invoiceNumber}/download`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 underline underline-offset-2"
                  >
                    <Download className="h-3 w-3" /> PDF
                  </a>
                  <ResendReceiptButton paymentId={p.id} invoiceNumber={p.invoiceNumber} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
