import { headers } from "next/headers";
import { CounterQrCode } from "@/components/dashboard/counter-qr-code";
import { getAppBaseUrl } from "@/lib/utils/url";

/**
 * Points members at the PUBLIC /scan page (not this dashboard route).
 * Dynamically resolves the active host from the incoming request headers
 * and falls back to getAppBaseUrl().
 */
export default async function QrDisplayPage() {
  let baseUrl = getAppBaseUrl();

  try {
    const headersList = await headers();
    const host = headersList.get("x-forwarded-host") || headersList.get("host");
    if (host && !host.includes("yourgym-app.vercel.app")) {
      const proto = headersList.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
      baseUrl = `${proto}://${host}`;
    }
  } catch {
    // Fallback to getAppBaseUrl() if headers() is unavailable
  }

  const scanUrl = `${baseUrl}/scan`;

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Scan to Check In</h1>
        <p className="mt-1 text-sm text-zinc-500">Open your phone camera and scan this code at the counter.</p>
      </div>
      <CounterQrCode value={scanUrl} />
      <p className="text-xs font-mono text-zinc-400">{scanUrl}</p>
    </div>
  );
}

