"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, KeyRound, AlertCircle, ShieldCheck, CheckCircle2, HelpCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { loginMemberWithPhoneAndPin } from "@/app/actions/member-public.actions";

export function MemberLookupForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPhone = phone.trim().replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter your 10-digit registered mobile number.");
      return;
    }

    if (!pin.trim()) {
      setError("Please enter your 4-digit Unique ID.");
      return;
    }

    setLoading(true);
    const res = await loginMemberWithPhoneAndPin({
      phone: cleanPhone,
      pinOrCode: pin.trim(),
    });
    setLoading(false);

    if (res.success && res.data) {
      setSuccessMsg(`Welcome, ${res.data.name}! Redirecting to your dashboard...`);
      setTimeout(() => {
        router.push(`/member/${res.data?.memberCode}`);
      }, 700);
    } else if (!res.success) {
      setError(res.error || "Authentication failed. Please check your credentials.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-left">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Field 1: Registered Mobile Number */}
      <div className="space-y-1.5">
        <Label htmlFor="memberPhone" className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 text-zinc-500" /> Registered Mobile Number
        </Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 border-r border-zinc-200 pr-2 text-xs font-medium text-zinc-500">
            <span>+91</span>
          </div>
          <Input
            id="memberPhone"
            type="tel"
            required
            maxLength={13}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="98765 43210"
            className="pl-14 text-sm font-medium tracking-wide"
            autoFocus
          />
        </div>
        <p className="text-[11px] text-zinc-400">The mobile number registered on your membership account.</p>
      </div>

      {/* Field 2: 4-digit Unique ID / PIN */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="memberPin" className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5 text-zinc-500" /> 4-Digit Unique ID / PIN
          </Label>
          <span className="text-[10px] text-zinc-400">e.g. 0001</span>
        </div>
        <Input
          id="memberPin"
          type="text"
          required
          maxLength={10}
          value={pin}
          onChange={(e) => setPin(e.target.value.toUpperCase())}
          placeholder="Enter 4-digit ID (e.g. 0001)"
          className="text-sm font-mono tracking-wider"
          autoCapitalize="characters"
        />
        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
          <HelpCircle className="h-3 w-3 text-zinc-400 shrink-0" />
          <span>Found on your membership receipt or ID card (e.g. last 4 digits of GYM-0001).</span>
        </div>
      </div>

      {/* Persistent Login Guarantee */}
      <div className="rounded-lg bg-zinc-100/70 p-2.5 text-[11px] text-zinc-600 flex items-center gap-2 border border-zinc-200/60">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>You will remain logged in automatically on this device until you manually log out.</span>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={loading || phone.trim().length < 10 || !pin.trim()}
        className="w-full font-semibold shadow-xs"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying Credentials…
          </>
        ) : (
          "Login to Member Dashboard"
        )}
      </Button>
    </form>
  );
}
