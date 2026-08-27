"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";
import { Role, UserStatus } from "@prisma/client";

// ----------------------------------------------------------------------------
// Every action here requires "staff:*" permissions, which the PERMISSIONS map
// in lib/auth/rbac.ts restricts to SUPER_ADMIN only. A STAFF or ADMIN calling
// these directly (e.g. by crafting a request) gets a ForbiddenError.
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

    revalidatePath("/dashboard/staff-management");
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

    revalidatePath("/dashboard/staff-management");
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
    revalidatePath("/dashboard/staff-management");
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

    // Soft-delete is generally safer than hard delete (preserves audit trail
    // for members they registered / payments they collected, which are
    // protected by onDelete: Restrict in the schema anyway).
    await prisma.user.update({
      where: { id: userId },
      data: { status: "SUSPENDED", email: `deleted+${userId}@invalid.local` },
    });

    revalidatePath("/dashboard/staff-management");
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
    // 1. Admin can ONLY reset passwords for Staff members
    if (session.role === "ADMIN" && target.role !== "STAFF") {
      return {
        success: false,
        error: "Admins are only permitted to change passwords for Staff members.",
      };
    }

    // 2. Super Admin can reset Staff and Admin passwords.
    // If target is another Super Admin, reject administrative override.
    if (session.role === "SUPER_ADMIN" && target.role === "SUPER_ADMIN" && target.id !== session.userId) {
      return {
        success: false,
        error: "Cannot reset another Super Admin's password. Use Account Settings for self-service password changes.",
      };
    }

    const passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    await prisma.user.update({
      where: { id: parsed.userId },
      data: { passwordHash },
    });

    revalidatePath("/dashboard/staff-management");
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
