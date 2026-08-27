"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { searchMembersBasic } from "@/app/actions/member.actions";
import { recordPayment } from "@/app/actions/payment.actions";

type MemberOption = { id: string; fullName: string; memberCode: string; phone: string; photoUrl: string | null };
type ActiveSub = { planMonths: number; feeAmount: unknown; dueDate: Date } | null;

type Props = {
  initialMember: (MemberOption & { activeSubscription: ActiveSub }) | null;
  /** Suggested price per plan duration from Gym Settings — a starting point only; the amount field
   * stays fully editable so any member can be charged more or less (see handleAmountChange). */
  defaultPricing: Record<string, number>;
};

const PLAN_OPTIONS = [
  { months: 1, label: "1 Month" },
  { months: 3, label: "3 Months" },
  { months: 6, label: "6 Months" },
  { months: 12, label: "12 Months" },
] as const;

export function RecordPaymentForm({ initialMember, defaultPricing }: Props) {
  const router = useRouter();
  const [member, setMember] = useState(initialMember);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberOption[]>([]);
  const [searching, setSearching] = useState(false);

  const [planMonths, setPlanMonths] = useState<1 | 3 | 6 | 12>(
    (initialMember?.activeSubscription?.planMonths as 1 | 3 | 6 | 12) ?? 1
  );
  const [amount, setAmount] = useState(
    initialMember?.activeSubscription
      ? String(initialMember.activeSubscription.feeAmount)
      : defaultPricing["1"]?.toString() ?? ""
  );
  // Renewing a known subscription counts as "already has a real amount" — don't
  // let a plan-duration change silently overwrite it with a generic suggestion.
  const [amountTouched, setAmountTouched] = useState(Boolean(initialMember?.activeSubscription));
  const [method, setMethod] = useState<"CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTHER">("CASH");
  const [startDate, setStartDate] = useState(defaultStartDate(initialMember?.activeSubscription ?? null));

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function handlePlanChange(months: 1 | 3 | 6 | 12) {
    setPlanMonths(months);
    if (!amountTouched) {
      const suggested = defaultPricing[String(months)];
      setAmount(suggested !== undefined ? suggested.toString() : "");
    }
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    setAmountTouched(true);
  }

  async function handleSearch(value: string) {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const res = await searchMembersBasic(value.trim());
    setResults(res);
    setSearching(false);
  }

  function selectMember(m: MemberOption) {
    setMember({ ...m, activeSubscription: null });
    setResults([]);
    setQuery("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!member) return;

    setSubmitting(true);
    setResult(null);

    const res = await recordPayment({
      memberId: member.id,
      planMonths,
      amount: Number(amount),
      method,
      startDate: new Date(startDate),
    });

    setSubmitting(false);

    if (res.success) {
      setResult({
        type: "success",
        message: `Payment recorded — invoice ${res.data?.invoiceNumber}. WhatsApp receipt sent to ${member.fullName}.`,
      });
      setTimeout(() => router.push(`/dashboard/members/${member.id}`), 1800);
    } else {
      setResult({ type: "error", message: res.error });
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {!member ? (
          <div className="space-y-3">
            <Label htmlFor="memberSearch">Find member</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                id="memberSearch"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by name, phone, or member code…"
                className="pl-9"
                autoFocus
              />
            </div>
            {searching && <p className="text-xs text-zinc-400">Searching…</p>}
            {results.length > 0 && (
              <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                {results.map((r) => (
                  <button
                    type="button"
                    key={r.id}
                    onClick={() => selectMember(r)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50"
                  >
                    {r.photoUrl ? (
                      <img src={r.photoUrl} alt={r.fullName} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-500">
                        {r.fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{r.fullName}</p>
                      <p className="text-xs text-zinc-500">{r.memberCode}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2.5">
              <div className="flex items-center gap-3">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt={member.fullName} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium text-zinc-600">
                    {member.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-zinc-900">{member.fullName}</p>
                  <p className="text-xs text-zinc-500">
                    {member.memberCode} · {member.phone}
                  </p>
                </div>
              </div>
              {/* Only offer to change the member if we started from search — not
                  when navigated here from a member's own profile page. */}
              {!initialMember && (
                <button type="button" onClick={() => setMember(null)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="planMonths">Plan</Label>
                <select
                  id="planMonths"
                  value={planMonths}
                  onChange={(e) => handlePlanChange(Number(e.target.value) as typeof planMonths)}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  {PLAN_OPTIONS.map((p) => (
                    <option key={p.months} value={p.months}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="method">Payment method</Label>
                <select
                  id="method"
                  value={method}
                  onChange={(e) => setMethod(e.target.value as typeof method)}
                  className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                />
                {!amountTouched && defaultPricing[String(planMonths)] !== undefined && (
                  <p className="text-xs text-zinc-400">Suggested from Settings — edit freely for this member.</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Plan starts from</Label>
                <Input
                  id="startDate"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>

            {result && (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
                  result.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                }`}
              >
                {result.type === "success" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{result.message}</span>
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Recording payment…
                </>
              ) : (
                "Record payment & send receipt"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

/** Renewing before expiry continues from the current due date; a lapsed or brand-new member starts today. */
function defaultStartDate(activeSubscription: ActiveSub): string {
  const today = new Date();
  if (activeSubscription && new Date(activeSubscription.dueDate) > today) {
    return new Date(activeSubscription.dueDate).toISOString().split("T")[0];
  }
  return today.toISOString().split("T")[0];
}
