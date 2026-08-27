import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { Role, UserStatus } from "@prisma/client";

/**
 * Lightweight JWT session layer for STAFF/ADMIN/SUPER_ADMIN dashboard logins.
 *
 * Why not NextAuth? This system has a very narrow auth surface (email+password
 * login for internal staff only — members never log in, they use QR + Member
 * Code lookup). A minimal JWT-in-httpOnly-cookie implementation is easier to
 * reason about for RBAC and keeps the middleware edge-compatible via `jose`.
 * Swap this file for a NextAuth/Clerk adapter if your team prefers that —
 * everything downstream only depends on the `SessionPayload` shape.
 */

const SESSION_COOKIE = "gym_session";
const secretKey = new TextEncoder().encode(process.env.SESSION_SECRET);
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8-hour shift-length session

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Reads + verifies the session cookie for use in Server Components,
 * Server Actions, and Route Handlers (Node runtime).
 * Returns null if there is no session or it's invalid/expired —
 * callers MUST treat null as "unauthenticated", never throw here.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE, secretKey };
