import { CounterQrCode } from "@/components/dashboard/counter-qr-code";

/**
 * Points members at the PUBLIC /scan page (not this dashboard route).
 * APP_BASE_URL is the same env var used by scripts/cron-due-reminders.ts —
 * set it once in .env and both features stay in sync.
 */
export default function QrDisplayPage() {
  const scanUrl = `${process.env.APP_BASE_URL ?? "http://localhost:3000"}/scan`;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Scan to Check In</h1>
        <p className="mt-1 text-sm text-zinc-500">Open your phone camera and scan this code at the counter.</p>
      </div>
      <CounterQrCode value={scanUrl} />
      <p className="text-xs text-zinc-400">{scanUrl}</p>
    </div>
  );
}
