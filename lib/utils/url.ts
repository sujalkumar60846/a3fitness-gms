/**
 * Resolves the base URL of the application.
 * Filters out template placeholder URLs and auto-detects Vercel production/preview URLs.
 */
export function getAppBaseUrl(): string {
  // 1. Explicitly configured APP_BASE_URL (ignoring default template placeholder)
  const appBaseUrl = process.env.APP_BASE_URL?.trim();
  if (appBaseUrl && !appBaseUrl.includes("yourgym-app.vercel.app")) {
    return appBaseUrl.replace(/\/$/, "");
  }

  // 2. Next.js Public URL
  const nextPublicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (nextPublicUrl && !nextPublicUrl.includes("yourgym-app.vercel.app")) {
    return nextPublicUrl.replace(/\/$/, "");
  }

  // 3. Vercel auto-provided production domain (e.g., a3fitness-gms.vercel.app)
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  // 4. Vercel auto-provided deployment domain
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // 5. Localhost fallback
  return "http://localhost:3000";
}
