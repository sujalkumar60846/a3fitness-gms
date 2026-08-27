"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, UserPlus, Sparkles, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoCapture } from "@/components/shared/photo-capture";
import { registerMember } from "@/app/actions/member.actions";
import type { Role } from "@prisma/client";

const PLAN_OPTIONS = [
  { months: 1, label: "1 Month" },
  { months: 3, label: "3 Months" },
  { months: 6, label: "6 Months" },
  { months: 12, label: "12 Months" },
] as const;

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
] as const;

type Props = {
  currentUser: { name: string; role: Role };
  defaultPricing: Record<string, number>;
  initialValues?: { fullName?: string; phone?: string; email?: string };
};

export function AddMemberForm({ currentUser, defaultPricing, initialValues }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [gender, setGender] = useState<(typeof GENDER_OPTIONS)[number]["value"]>("MALE");
  const [planMonths, setPlanMonths] = useState<(typeof PLAN_OPTIONS)[number]["months"]>(1);

  // Custom Member Code state
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [customCode, setCustomCode] = useState("");

  const [feeAmount, setFeeAmount] = useState(() => defaultPricing["1"]?.toString() ?? "");
  const [feeTouched, setFeeTouched] = useState(false);

  function handlePlanChange(months: (typeof PLAN_OPTIONS)[number]["months"]) {
    setPlanMonths(months);
    if (!feeTouched) {
      const suggested = defaultPricing[String(months)];
      setFeeAmount(suggested !== undefined ? suggested.toString() : "");
    }
  }

  function handleFeeChange(value: string) {
    setFeeAmount(value);
    setFeeTouched(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const form = new FormData(e.currentTarget);

    const joiningDateVal = form.get("joiningDate") ? String(form.get("joiningDate")) : undefined;
    const startDateVal = String(form.get("startDate") ?? new Date().toISOString());

    const res = await registerMember({
      fullName: String(form.get("fullName") ?? ""),
      email: String(form.get("email") ?? "").trim() || undefined,
      phone: String(form.get("phone") ?? ""),
      emergencyContact: String(form.get("emergencyContact") ?? ""),
      gender,
      joiningDate: joiningDateVal ? new Date(joiningDateVal) : undefined,
      planMonths,
      startDate: new Date(startDateVal),
      feeAmount: Number(feeAmount || 0),
      photoBase64: photoBase64 ?? undefined,
      customMemberCode: useCustomCode ? customCode.trim().toUpperCase() : undefined,
    });

    setSubmitting(false);

    if (res.success) {
      setResult({
        type: "success",
        message: `Member registered with ID ${res.data?.memberCode}. Redirecting to profile…`,
      });
      setTimeout(() => router.push(`/dashboard/members/${res.data?.id}`), 1200);
    } else {
      setResult({ type: "error", message: res.error });
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserPlus className="h-5 w-5" />
            Add New Member
          </CardTitle>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
            Adding as {currentUser.name} · {formatRole(currentUser.role)}
          </span>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PhotoCapture onChange={setPhotoBase64} />

          {/* Member Code Mode Switcher */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-zinc-700" />
                <span className="text-xs font-semibold text-zinc-900">Member ID Configuration</span>
              </div>
              <div className="flex items-center gap-1 bg-white rounded-lg border border-zinc-200 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setUseCustomCode(false)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    !useCustomCode ? "bg-zinc-900 text-white font-medium shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Unpredictable Auto
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setUseCustomCode(true)}
                  className={`px-2.5 py-1 rounded-md transition-colors ${
                    useCustomCode ? "bg-zinc-900 text-white font-medium shadow-xs" : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Custom ID
                </button>
              </div>
            </div>

            {useCustomCode ? (
              <div className="space-y-1">
                <Label htmlFor="customCode" className="text-xs text-zinc-600">Custom Member ID / RFID / Card No.</Label>
                <Input
                  id="customCode"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="e.g. GYM-VIP-101"
                  required={useCustomCode}
                  className="uppercase font-mono text-sm bg-white"
                />
                <p className="text-[11px] text-zinc-400">Must be unique across all gym members.</p>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                A secure random unpredictable code (e.g. <span className="font-mono font-medium text-zinc-800">GYM-8K4W9P</span>) will be assigned automatically to prevent ID guessing.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" name="fullName" required defaultValue={initialValues?.fullName ?? ""} placeholder="e.g. Rohan Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address (optional)</Label>
              <Input id="email" name="email" type="email" defaultValue={initialValues?.email ?? ""} placeholder="For PDF receipts & reminders" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number</Label>
              <Input id="phone" name="phone" type="tel" required defaultValue={initialValues?.phone ?? ""} placeholder="e.g. 9876543210" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emergencyContact">Emergency contact</Label>
              <Input id="emergencyContact" name="emergencyContact" type="tel" required placeholder="Family/friend's number" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="gender">Gender</Label>
              <select
                id="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as typeof gender)}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {GENDER_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="joiningDate">Joining Date (Member Since)</Label>
              <Input id="joiningDate" name="joiningDate" type="date" required defaultValue={todayISO()} />
              <p className="text-xs text-zinc-400">
                For existing gym clients, set the date they originally joined your gym. Defaults to today.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="planMonths">Plan</Label>
              <select
                id="planMonths"
                value={planMonths}
                onChange={(e) => handlePlanChange(Number(e.target.value) as typeof planMonths)}
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400"
              >
                {PLAN_OPTIONS.map((p) => (
                  <option key={p.months} value={p.months}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Plan start date</Label>
              <Input id="startDate" name="startDate" type="date" required defaultValue={todayISO()} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="feeAmount">Fee amount (₹)</Label>
              <Input
                id="feeAmount"
                type="number"
                min="0"
                step="0.01"
                required
                value={feeAmount}
                onChange={(e) => handleFeeChange(e.target.value)}
                placeholder="1500"
              />
              {!feeTouched && defaultPricing[String(planMonths)] !== undefined && (
                <p className="text-xs text-zinc-400">Suggested from Settings — edit freely for this member.</p>
              )}
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

          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding member…
              </>
            ) : (
              "Add member"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function formatRole(role: Role) {
  return role.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
