import { prisma } from "@/lib/prisma";
import type { AuditAction } from "@prisma/client";

export type AuditEventInput = {
  action: AuditAction;
  category: "SETTINGS" | "SECURITY" | "STAFF" | "MEMBER";
  actorName: string;
  actorRole?: string;
  targetName?: string;
  details: string;
  ipAddress?: string | null;
};

/**
 * Non-blocking audit logger — writes system & member activity to PostgreSQL.
 */
export async function logAuditEvent(input: AuditEventInput) {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        category: input.category,
        actorName: input.actorName,
        actorRole: input.actorRole ?? null,
        targetName: input.targetName ?? null,
        details: input.details,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    // Non-blocking: fail silently to prevent interrupting core transactional flow
    console.error("Failed to write audit log:", err);
  }
}

export type AuditLogFilter = {
  category?: string;
  action?: AuditAction;
  search?: string;
  take?: number;
  skip?: number;
};

export async function fetchRecentAuditLogs(filter?: AuditLogFilter) {
  try {
    const where: any = {};

    if (filter?.category && filter.category !== "ALL") {
      where.category = filter.category;
    }

    if (filter?.action) {
      where.action = filter.action;
    }

    if (filter?.search && filter.search.trim() !== "") {
      const q = filter.search.trim();
      where.OR = [
        { actorName: { contains: q, mode: "insensitive" } },
        { targetName: { contains: q, mode: "insensitive" } },
        { details: { contains: q, mode: "insensitive" } },
      ];
    }

    return await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filter?.take ?? 50,
      skip: filter?.skip ?? 0,
    });
  } catch (err) {
    console.error("Failed to fetch audit logs:", err);
    return [];
  }
}
