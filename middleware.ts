import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

/**
 * Edge middleware — the FIRST line of defense. It does coarse, path-based
 * role gating so unauthorized users never even reach a Server Component
 * (avoids flash-of-protected-content and saves a DB round trip).
 *
 * IMPORTANT: this is not the ONLY defense. Every Server Action / Route
 * Handler must still call requirePermission()/requireRole() from
 * lib/auth/rbac.ts — middleware can be bypassed by directly invoking a
 * server action from a malicious client, so defense-in-depth is mandatory.
 */

const SESSION_COOKIE = "gym_session";
const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET);

// Path prefix -> roles allowed to enter. Order matters: most specific first.
const ROUTE_RULES: { prefix: string; roles: string[] }[] = [
  { prefix: "/dashboard/staff-management", roles: ["SUPER_ADMIN", "ADMIN"] },
  { prefix: "/dashboard/settings", roles: ["SUPER_ADMIN"] },
  { prefix: "/dashboard/analytics", roles: ["SUPER_ADMIN", "ADMIN"] },
  { prefix: "/dashboard/broadcast", roles: ["SUPER_ADMIN", "ADMIN"] },
  { prefix: "/dashboard/reports", roles: ["SUPER_ADMIN", "ADMIN"] },
  { prefix: "/dashboard", roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
];

// Public routes members hit from the QR-scanned mobile flow — never gated.
const PUBLIC_PREFIXES = ["/scan", "/member", "/login", "/api/attendance/checkin", "/api/cron"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const rule = ROUTE_RULES.find((r) => pathname.startsWith(r.prefix));
  if (!rule) return NextResponse.next(); // not a gated route

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const { payload } = await jwtVerify(token, secretKey);
    const role = payload.role as string;
    const status = payload.status as string;

    if (status === "SUSPENDED" || !rule.roles.includes(role)) {
      return NextResponse.redirect(new URL("/dashboard/unauthorized", req.url));
    }

    return NextResponse.next();
  } catch {
    // Invalid/expired token
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
