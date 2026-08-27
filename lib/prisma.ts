import { PrismaClient } from "@prisma/client";

// Prevents "too many connections" during Next.js dev hot-reload, where
// modules are re-evaluated on every save but the process stays alive.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
