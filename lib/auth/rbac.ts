import "server-only";
import { Role } from "@prisma/client";
import { getSession, type SessionPayload } from "./session";

/**
 * Central permission map. Keep this as the single source of truth for
 * "what can each role do" — Server Actions call requirePermission(), never
 * hand-roll role checks inline. This makes an audit ("who can delete a
 * member?") a one-file grep instead of a codebase-wide hunt.
 */
export const PERMISSIONS = {
  // Staff & Admin account management
  "staff:create": ["SUPER_ADMIN"],
  "staff:update_role": ["SUPER_ADMIN"],
  "staff:suspend": ["SUPER_ADMIN"],
  "staff:delete": ["SUPER_ADMIN"],
  "staff:view": ["SUPER_ADMIN", "ADMIN"],
  "staff:reset_password": ["SUPER_ADMIN", "ADMIN"],

  // Members
  "member:create": ["SUPER_ADMIN", "ADMIN", "STAFF"],
  "member:update": ["SUPER_ADMIN", "ADMIN", "STAFF"],
  "member:delete": ["SUPER_ADMIN", "ADMIN"], // staff explicitly excluded per spec
  "member:view": ["SUPER_ADMIN", "ADMIN", "STAFF"],

  // Attendance
  "attendance:mark_manual": ["SUPER_ADMIN", "ADMIN", "STAFF"],
  "attendance:view": ["SUPER_ADMIN", "ADMIN", "STAFF"],

  // Payments / financials
  "payment:record": ["SUPER_ADMIN", "ADMIN", "STAFF"],
  "payment:view_reports": ["SUPER_ADMIN", "ADMIN", "STAFF"],
  "payment:adjust_fee": ["SUPER_ADMIN"],

  // System
  "settings:manage": ["SUPER_ADMIN"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "You must be signed in.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/** Pure function — no session lookup. Useful in UI to conditionally render buttons. */
export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/**
 * Guard for Server Actions / Route Handlers. Throws if unauthenticated,
 * suspended, or lacking the permission — callers should let this bubble
 * up (Next.js will render the nearest error boundary) or catch it to
 * return a typed { error } action result.
 */
export async function requirePermission(permission: Permission): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  if (session.status === "SUSPENDED") throw new ForbiddenError("Your account has been suspended.");
  if (!hasPermission(session.role, permission)) throw new ForbiddenError();
  return session;
}

/** Same idea, but for checking multiple acceptable roles directly (e.g. page-level gate). */
export async function requireRole(allowed: readonly Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new UnauthorizedError();
  if (session.status === "SUSPENDED") throw new ForbiddenError("Your account has been suspended.");
  if (!hasRole(session.role, allowed)) throw new ForbiddenError();
  return session;
}

export { Role };
