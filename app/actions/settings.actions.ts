"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";
import { getSession } from "@/lib/auth/session";
import { logAuditEvent } from "@/lib/audit";

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
  gymName: z.string().trim().min(2, "Gym name must be at least 2 characters").max(100),
  addressLine: z.string().trim().min(2, "Address must be at least 2 characters").max(200),
  phone: z.string().trim().min(5, "Phone must be at least 5 digits").max(20),
  email: z.string().trim().email("Please enter a valid email address"),
  gstNumber: z.string().trim().max(30).optional().nullable().or(z.literal("")).transform((v) => (v ? v : null)),
  invoicePrefix: z.string().trim().min(1, "Invoice prefix is required").max(10),
  allowOnlineRenewals: z.boolean().default(false),
  allowMemberPhotoUpdate: z.boolean().default(true),
  allowMemberEmailUpdate: z.boolean().default(true),
  // Keys are plan-month strings ("1"/"3"/"6"/"12") — suggested pricing
  defaultPricing: z.record(z.string(), z.number().nonnegative()).optional().default({}),
});

export async function updateGymSettings(
  input: z.infer<typeof updateSettingsSchema>
): Promise<ActionResult> {
  try {
    const session = await requirePermission("settings:manage");
    const parsed = updateSettingsSchema.parse(input);

    await prisma.gymSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        gymName: parsed.gymName,
        addressLine: parsed.addressLine,
        phone: parsed.phone,
        email: parsed.email,
        gstNumber: parsed.gstNumber,
        invoicePrefix: parsed.invoicePrefix,
        allowOnlineRenewals: parsed.allowOnlineRenewals,
        allowMemberPhotoUpdate: parsed.allowMemberPhotoUpdate,
        allowMemberEmailUpdate: parsed.allowMemberEmailUpdate,
        defaultPricing: parsed.defaultPricing,
      },
      update: {
        gymName: parsed.gymName,
        addressLine: parsed.addressLine,
        phone: parsed.phone,
        email: parsed.email,
        gstNumber: parsed.gstNumber,
        invoicePrefix: parsed.invoicePrefix,
        allowOnlineRenewals: parsed.allowOnlineRenewals,
        allowMemberPhotoUpdate: parsed.allowMemberPhotoUpdate,
        allowMemberEmailUpdate: parsed.allowMemberEmailUpdate,
        defaultPricing: parsed.defaultPricing,
      },
    });

    // Log Audit Event
    await logAuditEvent({
      action: "SETTINGS_UPDATED",
      category: "SETTINGS",
      actorName: session.name,
      actorRole: session.role,
      targetName: "Gym System Settings",
      details: `Updated gym settings: "${parsed.gymName}" | Photo Updates: ${parsed.allowMemberPhotoUpdate ? 'Enabled' : 'Locked'} | Gmail Updates: ${parsed.allowMemberEmailUpdate ? 'Enabled' : 'Locked'}`,
    });

    revalidatePath("/dashboard/settings");
    revalidatePath("/dashboard/members/new");
    revalidatePath("/dashboard/payments/new");
    revalidatePath("/dashboard/broadcast");
    revalidatePath("/dashboard/analytics");
    revalidatePath("/api/portal/settings");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.errors.map((e) => e.message).join(", ") };
    if (err instanceof Error) return { success: false, error: err.message };
    return { success: false, error: "Something went wrong saving settings." };
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
