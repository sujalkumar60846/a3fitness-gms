"use client";

import { useState } from "react";
import { Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { resendPaymentReceipt } from "@/app/actions/payment.actions";

type Props = {
  paymentId: string;
  invoiceNumber: string;
};

export function ResendReceiptButton({ paymentId, invoiceNumber }: Props) {
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleResend() {
    setSending(true);
    setFeedback(null);

    const res = await resendPaymentReceipt(paymentId);
    setSending(false);

    if (res.success) {
      setFeedback({ type: "success", message: res.data?.message || "Receipt resent." });
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: "error", message: res.error });
      setTimeout(() => setFeedback(null), 5000);
    }
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
        title="Resend receipt via WhatsApp & Email"
      >
        {sending ? (
          <Loader2 className="h-3 w-3 animate-spin text-zinc-400" />
        ) : (
          <Send className="h-3 w-3 text-zinc-400" />
        )}
        <span>Resend</span>
      </button>

      {feedback && (
        <div
          className={`absolute bottom-full right-0 mb-1 z-20 flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] shadow-md border ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-3 w-3 text-red-600 shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}
    </div>
  );
}
