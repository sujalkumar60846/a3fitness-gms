"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

/**
 * Read-only, available to ANY logged-in staff/admin role (not permission-gated
 * beyond "must be signed in") — this is what powers the "suggested price"
 * auto-fill in the Add Member and Record Payment forms. It's branding +
 * pricing info, not sensitive financial data, so a broad read is fine.
 */
export async function getGymSettings() {
  const session = await getSession();
  if (!session) return null;
  return prisma.gymSettings.findUnique({ where: { id: "singleton" } });
}

const updateSettingsSchema = z.object({
  gymName: z.string().min(2).max(100),
  addressLine: z.string().min(2).max(200),
  phone: z.string().min(5).max(20),
  email: z.string().email(),
  gstNumber: z.string().max(20).optional().or(z.literal("")),
  invoicePrefix: z.string().min(1).max(10),
  allowOnlineRenewals: z.boolean().default(false),
  allowMemberPhotoUpdate: z.boolean().default(true),
  // Keys are plan-month strings ("1"/"3"/"6"/"12") — a suggestion only,
  // never enforced. Every member/payment still stores its own fee amount.
  defaultPricing: z.record(z.string(), z.number().nonnegative()),
});

export async function updateGymSettings(
  input: z.infer<typeof updateSettingsSchema>
): Promise<ActionResult> {
  try {
    await requirePermission("settings:manage");
    const parsed = updateSettingsSchema.parse(input);

    await prisma.gymSettings.upsert({
      where: { id: "singleton" },
      create: { id: "singleton", ...parsed },
      update: parsed,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/members/new");
    revalidatePath("/dashboard/payments/new");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.errors.map((e) => e.message).join(", ") };
    if (err instanceof Error) return { success: false, error: err.message };
    return { success: false, error: "Something went wrong." };
  }
}

export async function testEmailConfiguration(targetEmail: string): Promise<ActionResult<{ messageId: string }>> {
  try {
    await requirePermission("settings:manage");
    if (!targetEmail || !targetEmail.includes("@")) {
      return { success: false, error: "Please enter a valid recipient email address." };
    }

    const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
    const { sendTestEmail } = await import("@/lib/email");
    const result = await sendTestEmail(targetEmail, gymSettings?.gymName || "Gym Management");

    if (result.success) {
      return { success: true, data: { messageId: result.messageId } };
    } else {
      return { success: false, error: result.error };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Test email failed" };
  }
}

