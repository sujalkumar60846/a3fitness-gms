"use client";

import { useState } from "react";
import Script from "next/script";
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { createOnlineRenewalOrder, verifyAndRecordOnlinePayment } from "@/app/actions/payment.actions";
import { formatCurrency } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function OnlineRenewalCard({
  memberCode,
  memberName,
  isExpired,
  defaultPricing,
}: {
  memberCode: string;
  memberName: string;
  isExpired: boolean;
  defaultPricing: Record<string, number>;
}) {
  const [selectedMonths, setSelectedMonths] = useState<1 | 3 | 6 | 12>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    invoiceNumber: string;
    invoiceUrl?: string | null;
  } | null>(null);

  const getPrice = (months: 1 | 3 | 6 | 12) => {
    return defaultPricing[String(months)] || months * 1000;
  };

  const currentPrice = getPrice(selectedMonths);

  async function handlePayOnline() {
    setLoading(true);
    setError(null);

    try {
      const orderRes = await createOnlineRenewalOrder({
        memberCode,
        planMonths: selectedMonths,
      });

      if (!orderRes.success) {
        setError(orderRes.error);
        setLoading(false);
        return;
      }

      if (!orderRes.data) {
        setError("Failed to obtain order details.");
        setLoading(false);
        return;
      }

      const { orderId, amount, currency, keyId, gymName, memberEmail, memberPhone } = orderRes.data;

      if (!window.Razorpay) {
        setError("Razorpay SDK failed to load. Please refresh and try again.");
        setLoading(false);
        return;
      }

      const options = {
        key: keyId || "rzp_test_placeholder",
        amount: amount,
        currency: currency || "INR",
        name: gymName,
        description: `Membership Renewal (${selectedMonths} Month${selectedMonths > 1 ? "s" : ""})`,
        order_id: orderId.startsWith("order_sim_") ? undefined : orderId,
        prefill: {
          name: memberName,
          email: memberEmail || undefined,
          contact: memberPhone || undefined,
        },
        theme: {
          color: "#18181b",
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await verifyAndRecordOnlinePayment({
              memberCode,
              planMonths: selectedMonths,
              amount: currentPrice,
              razorpayOrderId: response.razorpay_order_id || orderId,
              razorpayPaymentId: response.razorpay_payment_id || `pay_sim_${Date.now()}`,
              razorpaySignature: response.razorpay_signature || "sim_signature",
            });

            if (verifyRes.success && verifyRes.data) {
              setSuccessResult(verifyRes.data);
            } else {
              setError(verifyRes.success ? "Payment verification returned empty." : verifyRes.error);
            }
          } catch (err) {
            setError("Error processing payment response.");
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
      };

      if (!keyId || orderId.startsWith("order_sim_")) {
        setError("Razorpay payment gateway keys are not configured yet. Please ask the gym administrator to set up RAZORPAY_KEY_ID in .env.");
        setLoading(false);
        return;
      }

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setError(response.error?.description || "Payment failed at gateway.");
        setLoading(false);
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (successResult) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
        <h3 className="mt-2 text-base font-semibold text-zinc-900">Payment Successful!</h3>
        <p className="mt-1 text-xs text-zinc-600">
          Your membership plan has been extended for {selectedMonths} month{selectedMonths > 1 ? "s" : ""}.
        </p>
        <p className="mt-1 text-xs font-mono text-zinc-500">Invoice #{successResult.invoiceNumber}</p>
        {successResult.invoiceUrl && (
          <a
            href={successResult.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white hover:bg-zinc-800"
          >
            Download Invoice PDF
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-zinc-700" />
            <h3 className="text-sm font-semibold text-zinc-900">Pay Online & Renew</h3>
          </div>
          {isExpired && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-600">
              Expired
            </span>
          )}
        </div>

        <p className="mt-1 text-xs text-zinc-500">
          Select your renewal duration to pay instantly via UPI, Card, or Netbanking.
        </p>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 grid grid-cols-4 gap-2">
          {([1, 3, 6, 12] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSelectedMonths(m)}
              className={`rounded-lg border p-2.5 text-center transition-all ${
                selectedMonths === m
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <div className="text-xs font-bold">{m}M</div>
              <div className={`text-[10px] ${selectedMonths === m ? "text-zinc-300" : "text-zinc-500"}`}>
                {formatCurrency(getPrice(m))}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-zinc-100 pt-4">
          <div>
            <span className="text-xs text-zinc-400">Total payable</span>
            <p className="text-lg font-bold text-zinc-900">{formatCurrency(currentPrice)}</p>
          </div>
          <Button onClick={handlePayOnline} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            Pay with Razorpay
          </Button>
        </div>
      </div>
    </>
  );
}
