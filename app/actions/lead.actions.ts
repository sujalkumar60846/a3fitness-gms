"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import type { LeadStatus } from "@prisma/client";

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

/**
 * Available to SUPER_ADMIN, ADMIN, and STAFF alike.
 */
export async function listLeads(statusFilter?: LeadStatus | "ALL") {
  const session = await getSession();
  if (!session || !hasRole(session.role, ["SUPER_ADMIN", "ADMIN", "STAFF"])) {
    throw new Error("Unauthorized");
  }

  const where = statusFilter && statusFilter !== "ALL" ? { status: statusFilter } : {};

  return prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, ["SUPER_ADMIN", "ADMIN", "STAFF"])) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });

    revalidatePath("/dashboard/leads");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update lead" };
  }
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session || !hasRole(session.role, ["SUPER_ADMIN", "ADMIN", "STAFF"])) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.lead.delete({
      where: { id: leadId },
    });

    revalidatePath("/dashboard/leads");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete lead" };
  }
}