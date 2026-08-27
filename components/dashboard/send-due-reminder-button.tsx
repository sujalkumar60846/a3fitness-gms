"use client";

import { useState } from "react";
import { Bell, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendManualDueReminder } from "@/app/actions/payment.actions";

type Props = {
  memberId: string;
  memberName: string;
  isDue: boolean;
};

export function SendDueReminderButton({ memberId, memberName, isDue }: Props) {
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleSend() {
    if (!confirm(`Send membership due date reminder to ${memberName} via WhatsApp & Email?`)) {
      return;
    }

    setSending(true);
    setFeedback(null);

    const res = await sendManualDueReminder(memberId);
    setSending(false);

    if (res.success) {
      setFeedback({ type: "success", message: res.data?.message || "Reminder sent." });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: "error", message: res.error });
      setTimeout(() => setFeedback(null), 5000);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <Button
        variant={isDue ? "default" : "outline"}
        size="sm"
        onClick={handleSend}
        disabled={sending}
        className={isDue ? "bg-amber-600 hover:bg-amber-700 text-white gap-1.5" : "gap-1.5"}
      >
        {sending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Bell className="h-3.5 w-3.5" /> Send due reminder
          </>
        )}
      </Button>

      {feedback && (
        <div
          className={`absolute top-full left-0 mt-1 z-20 flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs shadow-md border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
