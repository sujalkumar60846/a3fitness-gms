"use client";

import { useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, Sparkles } from "lucide-react";
import { markMemberAttendanceSelf } from "@/app/actions/member-public.actions";

interface MemberAttendanceButtonProps {
  memberCode: string;
  hasAttendedToday: boolean;
  todayCheckInTime?: string;
}

export function MemberAttendanceButton({
  memberCode,
  hasAttendedToday: initialAttended,
  todayCheckInTime: initialTime,
}: MemberAttendanceButtonProps) {
  const [attended, setAttended] = useState(initialAttended);
  const [time, setTime] = useState(initialTime);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleMarkAttendance() {
    if (attended) return;
    setLoading(true);
    setFeedback(null);

    const res = await markMemberAttendanceSelf(memberCode);
    setLoading(false);

    if (res.success) {
      setAttended(true);
      if (res.data?.checkInTime) {
        setTime(res.data.checkInTime);
      }
      setFeedback(res.message || "Attendance marked successfully for today!");
    } else {
      setFeedback(res.error);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs text-center space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-zinc-800" />
          <h3 className="font-semibold text-zinc-900 text-sm">Daily Gym Attendance</h3>
        </div>
        <span className="text-xs font-mono text-zinc-400">
          {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </div>

      {attended ? (
        <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 space-y-1">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Attendance Marked For Today</span>
          </div>
          <p className="text-xs text-emerald-700">
            Check-in recorded at <strong className="font-mono">{time || "Today"}</strong>. Have a great workout!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500">
            Arrived at the gym? Tap the button below to immediately mark your daily check-in streak.
          </p>
          <button
            onClick={handleMarkAttendance}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Marking Attendance...</span>
              </>
            ) : (
              <>
                <ClipboardCheck className="h-4 w-4 text-emerald-400" />
                <span>Mark Attendance for Today</span>
              </>
            )}
          </button>
        </div>
      )}

      {feedback && !attended && (
        <p className="text-xs text-rose-600 font-medium">{feedback}</p>
      )}
    </div>
  );
}