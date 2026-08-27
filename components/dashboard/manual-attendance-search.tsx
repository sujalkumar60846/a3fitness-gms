"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Check, Loader2, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchMembersForCheckin, markAttendanceManually } from "@/app/actions/attendance.actions";

type Result = {
  id: string;
  fullName: string;
  memberCode: string;
  photoUrl: string | null;
  alreadyCheckedIn: boolean;
};

export function ManualAttendanceSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      const res = await searchMembersForCheckin(query.trim());
      setResults(res);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  async function handleMark(memberId: string) {
    setMarkingId(memberId);
    setFeedback(null);
    const res = await markAttendanceManually(memberId);
    setMarkingId(null);

    if (res.success) {
      setFeedback({ type: "success", message: "Checked in successfully." });
      setResults((prev) => prev.map((r) => (r.id === memberId ? { ...r, alreadyCheckedIn: true } : r)));
      router.refresh(); // re-fetches today's list on the parent Server Component
    } else {
      setFeedback({ type: "error", message: res.error });
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, phone, or member code…"
          className="pl-9"
        />
      </div>

      {searching && <p className="text-xs text-zinc-400">Searching…</p>}

      {results.length > 0 && (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {results.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                {r.photoUrl ? (
                  <img src={r.photoUrl} alt={r.fullName} className="h-8 w-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-500">
                    {r.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{r.fullName}</p>
                  <p className="text-xs text-zinc-500">{r.memberCode}</p>
                </div>
              </div>

              {r.alreadyCheckedIn ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600">
                  <Check className="h-3.5 w-3.5" /> Checked in
                </span>
              ) : (
                <Button size="sm" onClick={() => handleMark(r.id)} disabled={markingId === r.id}>
                  {markingId === r.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserCheck className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {feedback && (
        <p className={`text-xs ${feedback.type === "success" ? "text-emerald-600" : "text-red-600"}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
