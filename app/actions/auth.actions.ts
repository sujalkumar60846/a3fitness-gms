"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSession } from "@/lib/auth/session";

type ActionResult = { success: true } | { success: false; error: string };

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(input: z.infer<typeof loginSchema>): Promise<ActionResult> {
  try {
    const parsed = loginSchema.parse(input);

    const user = await prisma.user.findUnique({ where: { email: parsed.email } });
    // Deliberately vague error message — don't leak whether the email exists.
    if (!user) return { success: false, error: "Invalid email or password." };

    if (user.status === "SUSPENDED") {
      return { success: false, error: "Your account has been suspended. Contact your Super Admin." };
    }

    const valid = await bcrypt.compare(parsed.password, user.passwordHash);
    if (!valid) return { success: false, error: "Invalid email or password." };

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: "Please enter a valid email and password." };
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

export async function logout(): Promise<ActionResult> {
  await destroySession();
  return { success: true };
}

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export async function changeMyPassword(
  input: z.infer<typeof changePasswordSchema>
): Promise<ActionResult> {
  try {
    const session = await getSession();
    if (!session) return { success: false, error: "You must be signed in to change your password." };
    if (session.status === "SUSPENDED") return { success: false, error: "Your account is suspended." };

    const parsed = changePasswordSchema.parse(input);

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return { success: false, error: "User account not found." };

    const isCurrentValid = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return { success: false, error: "Current password is incorrect." };
    }

    const passwordHash = await bcrypt.hash(parsed.newPassword, 12);
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash },
    });

    const { logAuditEvent } = await import("@/lib/audit");
    await logAuditEvent({
      action: "PASSWORD_CHANGED",
      category: "SECURITY",
      actorName: session.name,
      actorRole: session.role,
      targetName: session.email,
      details: `${session.name} (${session.role}) changed their personal account password.`,
    });

    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors.map((e) => e.message).join(", ") };
    }
    return { success: false, error: "Failed to update password. Please try again." };
  }
}
