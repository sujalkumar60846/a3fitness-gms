"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";
import { Role, UserStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

// ----------------------------------------------------------------------------
// Staff & Admin account management with full Super Admin Audit Logging
// ----------------------------------------------------------------------------

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

const createStaffSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(7).max(20).optional(),
  role: z.enum(["ADMIN", "STAFF"]), // SUPER_ADMIN cannot be self-assigned via this form
  temporaryPassword: z.string().min(8),
});

export async function createStaffAccount(
  input: z.infer<typeof createStaffSchema>
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requirePermission("staff:create");
    const parsed = createStaffSchema.parse(input);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) return { success: false, error: "A user with this email already exists." };

    const passwordHash = await bcrypt.hash(parsed.temporaryPassword, 12);

    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        role: parsed.role as Role,
        passwordHash,
        createdById: session.userId,
      },
      select: { id: true },
    });

    await logAuditEvent({
      action: "STAFF_CREATED",
      category: "STAFF",
      actorName: session.name,
      actorRole: session.role,
      targetName: `${parsed.name} (${parsed.role})`,
      details: `Created new staff account for ${parsed.name} (${parsed.email}) with role ${parsed.role}.`,
    });

    revalidatePath("/dashboard/staff-management");
    revalidatePath("/dashboard/analytics");
    return { success: true, data: user };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

const updateRoleSchema = z.object({
  userId: z.string().cuid(),
  newRole: z.enum(["ADMIN", "STAFF"]),
});

export async function updateStaffRole(
  input: z.infer<typeof updateRoleSchema>
): Promise<ActionResult> {
  try {
    const session = await requirePermission("staff:update_role");
    const parsed = updateRoleSchema.parse(input);

    if (parsed.userId === session.userId) {
      return { success: false, error: "You cannot change your own role." };
    }

    const target = await prisma.user.findUnique({ where: { id: parsed.userId } });
    if (!target) return { success: false, error: "User not found." };
    if (target.role === "SUPER_ADMIN") {
      return { success: false, error: "Super Admin role cannot be modified here." };
    }

    await prisma.user.update({
      where: { id: parsed.userId },
      data: { role: parsed.newRole as Role },
    });

    await logAuditEvent({
      action: "STAFF_ROLE_UPDATED",
      category: "STAFF",
      actorName: session.name,
      actorRole: session.role,
      targetName: `${target.name} (${target.role} → ${parsed.newRole})`,
      details: `Updated role for ${target.name} from ${target.role} to ${parsed.newRole}.`,
    });

    revalidatePath("/dashboard/staff-management");
    revalidatePath("/dashboard/analytics");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function setStaffStatus(
  userId: string,
  status: "ACTIVE" | "SUSPENDED"
): Promise<ActionResult> {
  try {
    const session = await requirePermission("staff:suspend");
    if (userId === session.userId) {
      return { success: false, error: "You cannot suspend your own account." };
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return { success: false, error: "User not found." };
    if (target.role === "SUPER_ADMIN") {
      return { success: false, error: "Super Admin accounts cannot be suspended." };
    }

    await prisma.user.update({ where: { id: userId }, data: { status: status as UserStatus } });

    await logAuditEvent({
      action: "STAFF_STATUS_UPDATED",
      category: "STAFF",
      actorName: session.name,
      actorRole: session.role,
      targetName: `${target.name} (${target.role})`,
      details: `Account status updated to ${status} for ${target.name}.`,
    });

    revalidatePath("/dashboard/staff-management");
    revalidatePath("/dashboard/analytics");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function deleteStaffAccount(userId: string): Promise<ActionResult> {
  try {
    const session = await requirePermission("staff:delete");
    if (userId === session.userId) {
      return { success: false, error: "You cannot delete your own account." };
    }

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return { success: false, error: "User not found." };
    if (target.role === "SUPER_ADMIN") {
      return { success: false, error: "Super Admin accounts cannot be deleted." };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED", email: `deleted+${userId}@invalid.local` },
    });

    await logAuditEvent({
      action: "STAFF_DELETED",
      category: "STAFF",
      actorName: session.name,
      actorRole: session.role,
      targetName: `${target.name} (${target.role})`,
      details: `Deleted account for ${target.name} (${target.email}).`,
    });

    revalidatePath("/dashboard/staff-management");
    revalidatePath("/dashboard/analytics");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

const resetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export async function resetStaffPassword(
  userId: string,
  newPassword: string
): Promise<ActionResult> {
  try {
    const session = await requirePermission("staff:reset_password");
    const parsed = resetPasswordSchema.parse({ userId, newPassword });

    const target = await prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true, name: true, role: true, email: true },
    });

    if (!target) return { success: false, error: "User not found." };

    // RBAC Hierarchy Rules:
    // 1. Staff cannot use administrative reset
    if (session.role === "STAFF") {
      return {
        success: false,
        error: "Desk Staff members can only change their own password in My Account.",
      };
    }

    // 2. Admin can ONLY reset passwords for Staff members and their own account
    if (session.role === "ADMIN") {
      if (target.role === "SUPER_ADMIN") {
        return {
          success: false,
          error: "Admins are not authorized to change Super Admin passwords.",
        };
      }
      if (target.role === "ADMIN" && target.id !== session.userId) {
        return {
          success: false,
          error: "Admins can only change passwords for Desk Staff members and their own account.",
        };
      }
    }

    // 3. Super Admin can permanently set passwords for ALL accounts (Super Admin, Admin, and Staff).
    const passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    await prisma.user.update({
      where: { id: parsed.userId },
      data: { passwordHash },
    });

    // Log Audit Event
    await logAuditEvent({
      action: "STAFF_PASSWORD_RESET",
      category: "SECURITY",
      actorName: session.name,
      actorRole: session.role,
      targetName: `${target.name} (${target.role})`,
      details: `${session.name} (${session.role}) set a new permanent password for ${target.name} (${target.email} · ${target.role}).`,
    });

    revalidatePath("/dashboard/staff-management");
    revalidatePath("/dashboard/account");
    revalidatePath("/dashboard/analytics");
    return { success: true };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function listStaff() {
  await requirePermission("staff:view");
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
}

function errorMessage(err: unknown): string {
  if (err instanceof z.ZodError) return err.errors.map((e) => e.message).join(", ");
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
