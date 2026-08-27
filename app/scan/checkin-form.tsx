"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type CheckinResult =
  | { success: true; data: { memberName: string; checkInTime: string; membershipExpired: boolean } }
  | { success: false; error: string };

export function CheckinForm() {
  const [memberCode, setMemberCode] = useState("");
  const [lastCode, setLastCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!memberCode.trim()) return;

    setSubmitting(true);
    setResult(null);
    const code = memberCode.trim();

    try {
      const res = await fetch("/api/attendance/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberCode: code }),
      });
      const data: CheckinResult = await res.json();
      setResult(data);
      if (data.success) {
        setLastCode(code);
        setMemberCode("");
      }
    } catch {
      setResult({ success: false, error: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Input
          value={memberCode}
          onChange={(e) => setMemberCode(e.target.value.toUpperCase())}
          placeholder="e.g. GYM-0001"
          className="text-center text-lg tracking-wide"
          autoFocus
          autoCapitalize="characters"
        />
        <Button type="submit" size="lg" disabled={submitting || !memberCode.trim()}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Check In
        </Button>
      </form>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-lg px-4 py-3 text-left text-sm ${
            result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <div>
            {result.success ? (
              <>
                <p className="font-medium">Welcome, {result.data.memberName}!</p>
                <p className="text-xs opacity-80">
                  Checked in at{" "}
                  {new Date(result.data.checkInTime).toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {result.data.membershipExpired && (
                  <p className="mt-1 text-xs font-medium text-amber-700">
                    ⚠ Your membership has expired — please see reception to renew.
                  </p>
                )}
                <Link
                  href={`/member/${lastCode}`}
                  className="mt-2 inline-block text-xs font-medium underline underline-offset-2"
                >
                  View my plan &amp; attendance history →
                </Link>
              </>
            ) : (
              <p>{result.error}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
