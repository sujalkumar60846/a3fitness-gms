"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";
import { generateInvoicePdf } from "@/lib/pdf/invoice";
import { uploadInvoicePdf } from "@/lib/cloudinary";
import { sendPaymentConfirmation, sendDueReminder, toE164 } from "@/lib/whatsapp";
import { sendEmailPaymentConfirmation, sendEmailDueReminder } from "@/lib/email";
import { createRazorpayOrder, verifyRazorpaySignature, getRazorpayKeyId } from "@/lib/razorpay";
import { generateInvoiceNumber, addMonths, formatCurrency } from "@/lib/utils/generators";

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

const recordPaymentSchema = z.object({
  memberId: z.string().cuid(),
  planMonths: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]),
  amount: z.number().positive(),
  method: z.enum(["CASH", "CARD", "UPI", "ONLINE_RAZORPAY", "BANK_TRANSFER", "OTHER"]),
  startDate: z.coerce.date().optional(),
});

/**
 * The full billing pipeline:
 *   1. Create/renew Subscription (extends dueDate).
 *   2. Insert Payment record.
 *   3. Generate branded PDF invoice.
 *   4. Upload invoice to Cloudinary.
 *   5. Send WhatsApp + Email confirmations with the invoice link.
 */
export async function recordPayment(
  input: z.infer<typeof recordPaymentSchema>
): Promise<ActionResult<{ paymentId: string; invoiceNumber: string }>> {
  try {
    const session = await requirePermission("payment:record");
    const parsed = recordPaymentSchema.parse(input);

    const member = await prisma.member.findUnique({ where: { id: parsed.memberId } });
    if (!member) return { success: false, error: "Member not found." };

    const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
    if (!gymSettings) return { success: false, error: "Gym settings not configured. Ask a Super Admin to set them up." };

    const startDate = parsed.startDate ?? new Date();
    const dueDate = addMonths(startDate, parsed.planMonths);
    const invoiceNumber = await generateInvoiceNumber(gymSettings.invoicePrefix);

    const { payment, subscription } = await prisma.$transaction(async (tx) => {
      // Expire any currently-active subscription before creating the new one.
      await tx.subscription.updateMany({
        where: { memberId: member.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });

      const subscription = await tx.subscription.create({
        data: {
          memberId: member.id,
          planMonths: parsed.planMonths,
          feeAmount: parsed.amount,
          startDate,
          dueDate,
          status: "ACTIVE",
        },
      });

      const payment = await tx.payment.create({
        data: {
          invoiceNumber,
          memberId: member.id,
          subscriptionId: subscription.id,
          amount: parsed.amount,
          method: parsed.method,
          collectedById: session.userId,
        },
      });

      return { payment, subscription };
    });

    // --- Post-commit side effects (best-effort, non-blocking for the counter sale) ---
    try {
      const pdfBuffer = await generateInvoicePdf({
        invoiceNumber,
        paidAt: payment.paidAt,
        gym: {
          name: gymSettings.gymName,
          address: gymSettings.addressLine,
          phone: gymSettings.phone,
          email: gymSettings.email,
          logoUrl: gymSettings.logoUrl,
          gstNumber: gymSettings.gstNumber,
        },
        member: { fullName: member.fullName, memberCode: member.memberCode, phone: member.phone },
        subscription: { planMonths: parsed.planMonths, startDate, dueDate },
        amount: formatCurrency(parsed.amount),
        method: parsed.method,
      });

      const uploaded = await uploadInvoicePdf(pdfBuffer, invoiceNumber);

      await prisma.payment.update({
        where: { id: payment.id },
        data: { invoiceUrl: uploaded.url },
      });

      // 1. Send WhatsApp Confirmation
      sendPaymentConfirmation({
        phoneE164: toE164(member.phone),
        memberName: member.fullName,
        amount: formatCurrency(parsed.amount),
        invoiceUrl: uploaded.url,
      }).then((waResult) => {
        prisma.whatsAppLog.create({
          data: {
            memberId: member.id,
            type: "PAYMENT_CONFIRMATION",
            date: new Date(),
            status: waResult.success ? "SENT" : "FAILED",
            waMessageId: waResult.success ? waResult.messageId : null,
            errorMessage: waResult.success ? null : waResult.error,
          },
        }).catch(() => {});
      }).catch(() => {});

      // 2. Send Email Confirmation
      if (member.email) {
        sendEmailPaymentConfirmation({
          to: member.email,
          memberName: member.fullName,
          amount: formatCurrency(parsed.amount),
          invoiceNumber,
          planMonths: parsed.planMonths,
          startDate: startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          dueDate: dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          paymentDate: payment.paidAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          invoiceUrl: uploaded.url,
          gymName: gymSettings.gymName,
        }).then((emailResult) => {
          prisma.emailLog.create({
            data: {
              memberId: member.id,
              type: "PAYMENT_CONFIRMATION",
              date: new Date(),
              status: emailResult.success ? "SENT" : "FAILED",
              messageId: emailResult.success ? emailResult.messageId : null,
              errorMessage: emailResult.success ? null : emailResult.error,
            },
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch (sideEffectErr) {
      console.error("Post-payment invoice/notification pipeline failed:", sideEffectErr);
    }

    revalidatePath("/dashboard/members");
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/analytics");
    revalidatePath(`/dashboard/members/${member.id}`);

    return { success: true, data: { paymentId: payment.id, invoiceNumber } };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

/**
 * Public Server Action: Initiates a Razorpay online payment order for member self-renewal.
 */
export async function createOnlineRenewalOrder(input: {
  memberCode: string;
  planMonths: 1 | 3 | 6 | 12;
}): Promise<
  ActionResult<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    memberName: string;
    memberEmail?: string | null;
    memberPhone: string;
    gymName: string;
  }>
> {
  try {
    const member = await prisma.member.findUnique({
      where: { memberCode: input.memberCode.toUpperCase() },
      include: {
        subscriptions: { orderBy: { dueDate: "desc" }, take: 1 },
      },
    });

    if (!member) return { success: false, error: "Member not found." };
    if (!member.isActive) return { success: false, error: "Membership is deactivated. Please contact gym reception." };

    const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
    if (!gymSettings) return { success: false, error: "Gym settings not configured." };
    if (!gymSettings.allowOnlineRenewals) {
      return { success: false, error: "Online member self-renewal is currently disabled by gym administration." };
    }

    const defaultPricing = (gymSettings.defaultPricing as Record<string, number>) || {};

    // Calculate price: default pricing for duration or fall back to previous plan's fee
    let feeAmount = defaultPricing[String(input.planMonths)];
    if (!feeAmount) {
      const latestSub = member.subscriptions[0];
      if (latestSub && latestSub.planMonths === input.planMonths) {
        feeAmount = Number(latestSub.feeAmount);
      } else {
        feeAmount = 1000 * input.planMonths; // safe default fallback
      }
    }

    const orderRes = await createRazorpayOrder({
      amountInRupees: feeAmount,
      receipt: `RCPT-${member.memberCode}-${Date.now().toString(36)}`,
      notes: {
        memberCode: member.memberCode,
        memberName: member.fullName,
        planMonths: String(input.planMonths),
      },
    });

    if (!orderRes.success) {
      return { success: false, error: orderRes.error };
    }

    return {
      success: true,
      data: {
        orderId: orderRes.orderId,
        amount: orderRes.amount,
        currency: orderRes.currency,
        keyId: getRazorpayKeyId(),
        memberName: member.fullName,
        memberEmail: member.email,
        memberPhone: member.phone,
        gymName: gymSettings?.gymName || "Gym Management",
      },
    };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

/**
 * Public Server Action: Verifies Razorpay HMAC signature and securely records the online payment.
 */
export async function verifyAndRecordOnlinePayment(input: {
  memberCode: string;
  planMonths: 1 | 3 | 6 | 12;
  amount: number; // in Rupees
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}): Promise<ActionResult<{ invoiceNumber: string; invoiceUrl?: string | null }>> {
  try {
    const isValid = verifyRazorpaySignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });

    if (!isValid) {
      return { success: false, error: "Payment verification failed. Invalid signature." };
    }

    const member = await prisma.member.findUnique({
      where: { memberCode: input.memberCode.toUpperCase() },
      include: { subscriptions: { orderBy: { dueDate: "desc" }, take: 1 } },
    });

    if (!member) return { success: false, error: "Member record not found." };

    const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
    if (!gymSettings) return { success: false, error: "Gym settings not configured." };
    if (!gymSettings.allowOnlineRenewals) {
      return { success: false, error: "Online member self-renewal is currently disabled by gym administration." };
    }

    const latestSub = member.subscriptions[0];
    const now = new Date();
    // If the active plan is not expired yet, extend from existing dueDate; otherwise from today
    const startDate = latestSub && latestSub.dueDate > now ? latestSub.dueDate : now;
    const dueDate = addMonths(startDate, input.planMonths);
    const invoiceNumber = await generateInvoiceNumber(gymSettings.invoicePrefix);

    const { payment, subscription } = await prisma.$transaction(async (tx) => {
      await tx.subscription.updateMany({
        where: { memberId: member.id, status: "ACTIVE" },
        data: { status: "EXPIRED" },
      });

      const subscription = await tx.subscription.create({
        data: {
          memberId: member.id,
          planMonths: input.planMonths,
          feeAmount: input.amount,
          startDate,
          dueDate,
          status: "ACTIVE",
        },
      });

      const payment = await tx.payment.create({
        data: {
          invoiceNumber,
          memberId: member.id,
          subscriptionId: subscription.id,
          amount: input.amount,
          method: "ONLINE_RAZORPAY",
          razorpayOrderId: input.razorpayOrderId,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
          collectedById: null, // Self online payment
        },
      });

      return { payment, subscription };
    });

    let uploadedUrl: string | null = null;

    // Post-commit side effects: invoice generation and notifications
    try {
      const pdfBuffer = await generateInvoicePdf({
        invoiceNumber,
        paidAt: payment.paidAt,
        gym: {
          name: gymSettings.gymName,
          address: gymSettings.addressLine,
          phone: gymSettings.phone,
          email: gymSettings.email,
          logoUrl: gymSettings.logoUrl,
          gstNumber: gymSettings.gstNumber,
        },
        member: { fullName: member.fullName, memberCode: member.memberCode, phone: member.phone },
        subscription: { planMonths: input.planMonths, startDate, dueDate },
        amount: formatCurrency(input.amount),
        method: "ONLINE_RAZORPAY",
      });

      const uploaded = await uploadInvoicePdf(pdfBuffer, invoiceNumber);
      uploadedUrl = uploaded.url;

      await prisma.payment.update({
        where: { id: payment.id },
        data: { invoiceUrl: uploaded.url },
      });

      // 1. WhatsApp notification
      sendPaymentConfirmation({
        phoneE164: toE164(member.phone),
        memberName: member.fullName,
        amount: formatCurrency(input.amount),
        invoiceUrl: uploaded.url,
      }).then((waResult) => {
        prisma.whatsAppLog.create({
          data: {
            memberId: member.id,
            type: "PAYMENT_CONFIRMATION",
            date: new Date(),
            status: waResult.success ? "SENT" : "FAILED",
            waMessageId: waResult.success ? waResult.messageId : null,
            errorMessage: waResult.success ? null : waResult.error,
          },
        }).catch(() => {});
      }).catch(() => {});

      // 2. Email notification
      if (member.email) {
        sendEmailPaymentConfirmation({
          to: member.email,
          memberName: member.fullName,
          amount: formatCurrency(input.amount),
          invoiceNumber,
          planMonths: input.planMonths,
          startDate: startDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          dueDate: dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          paymentDate: payment.paidAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
          invoiceUrl: uploaded.url,
          gymName: gymSettings.gymName,
        }).then((emailResult) => {
          prisma.emailLog.create({
            data: {
              memberId: member.id,
              type: "PAYMENT_CONFIRMATION",
              date: new Date(),
              status: emailResult.success ? "SENT" : "FAILED",
              messageId: emailResult.success ? emailResult.messageId : null,
              errorMessage: emailResult.success ? null : emailResult.error,
            },
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch (sideEffectErr) {
      console.error("Online payment invoice/notification failed:", sideEffectErr);
    }

    revalidatePath(`/member/${member.memberCode}`);
    revalidatePath("/dashboard/payments");
    revalidatePath("/dashboard/members");
    revalidatePath("/dashboard/analytics");

    return {
      success: true,
      data: { invoiceNumber, invoiceUrl: uploadedUrl },
    };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

export async function getMemberPaymentHistory(memberId: string) {
  await requirePermission("member:view");
  return prisma.payment.findMany({
    where: { memberId },
    include: {
      collectedBy: { select: { name: true } },
      subscription: { select: { planMonths: true, startDate: true, dueDate: true } },
    },
    orderBy: { paidAt: "desc" },
  });
}

export async function listPayments(memberId?: string) {
  await requirePermission("payment:view_reports");
  return prisma.payment.findMany({
    where: memberId ? { memberId } : undefined,
    include: { member: { select: { fullName: true, memberCode: true } } },
    orderBy: { paidAt: "desc" },
  });
}

/**
 * On-demand manual trigger to send Due Date Reminder to a member via WhatsApp and Email.
 */
export async function sendManualDueReminder(memberId: string): Promise<
  ActionResult<{
    channels: { whatsapp: boolean; email: boolean };
    message: string;
  }>
> {
  try {
    await requirePermission("payment:record");

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: {
        subscriptions: { orderBy: { dueDate: "desc" }, take: 1 },
      },
    });

    if (!member) return { success: false, error: "Member not found." };
    if (!member.isActive) return { success: false, error: "Member is currently deactivated/frozen." };

    const latestSub = member.subscriptions[0];
    if (!latestSub) return { success: false, error: "No subscription found for this member." };

    const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
    const gymName = gymSettings?.gymName || "Our Gym";
    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const payOnlineUrl = `${appBaseUrl}/member/${member.memberCode}`;

    const formattedDueDate = latestSub.dueDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedAmount = formatCurrency(latestSub.feeAmount.toString());
    const today = new Date();

    const channels = { whatsapp: false, email: false };

    // 1. WhatsApp Reminder
    const waResult = await sendDueReminder({
      phoneE164: toE164(member.phone),
      memberName: member.fullName,
      dueDate: formattedDueDate,
      amount: formattedAmount,
    });

    await prisma.whatsAppLog.create({
      data: {
        memberId: member.id,
        type: "DUE_REMINDER",
        date: today,
        status: waResult.success ? "SENT" : "FAILED",
        waMessageId: waResult.success ? waResult.messageId : null,
        errorMessage: waResult.success ? null : waResult.error,
      },
    }).catch(() => {});

    if (waResult.success) channels.whatsapp = true;

    // 2. Email Reminder
    if (member.email) {
      const emailResult = await sendEmailDueReminder({
        to: member.email,
        memberName: member.fullName,
        dueDate: formattedDueDate,
        amount: formattedAmount,
        gymName,
        payOnlineUrl,
      });

      await prisma.emailLog.create({
        data: {
          memberId: member.id,
          type: "DUE_REMINDER",
          date: today,
          status: emailResult.success ? "SENT" : "FAILED",
          messageId: emailResult.success ? emailResult.messageId : null,
          errorMessage: emailResult.success ? null : emailResult.error,
        },
      }).catch(() => {});

      if (emailResult.success) channels.email = true;
    }

    const channelSummary = [
      channels.whatsapp ? "WhatsApp" : null,
      channels.email ? "Email" : null,
    ].filter(Boolean).join(" & ");

    return {
      success: true,
      data: {
        channels,
        message: channelSummary
          ? `Due reminder sent successfully via ${channelSummary}.`
          : "Reminder attempted (check WhatsApp/Email credentials).",
      },
    };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

/**
 * On-demand manual trigger to resend the payment confirmation & PDF invoice receipt to a member.
 */
export async function resendPaymentReceipt(paymentId: string): Promise<
  ActionResult<{
    invoiceUrl?: string | null;
    channels: { whatsapp: boolean; email: boolean };
    message: string;
  }>
> {
  try {
    await requirePermission("payment:record");

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        member: true,
        subscription: true,
      },
    });

    if (!payment) return { success: false, error: "Payment record not found." };

    const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
    const gymName = gymSettings?.gymName || "Our Gym";

    let invoiceUrl = payment.invoiceUrl;

    // If invoiceUrl is missing, generate and upload it now
    if (!invoiceUrl) {
      try {
        const pdfBuffer = await generateInvoicePdf({
          invoiceNumber: payment.invoiceNumber,
          paidAt: payment.paidAt,
          gym: {
            name: gymSettings?.gymName || "Our Gym",
            address: gymSettings?.addressLine || "",
            phone: gymSettings?.phone || "",
            email: gymSettings?.email || "",
            logoUrl: gymSettings?.logoUrl,
            gstNumber: gymSettings?.gstNumber,
          },
          member: {
            fullName: payment.member.fullName,
            memberCode: payment.member.memberCode,
            phone: payment.member.phone,
          },
          subscription: {
            planMonths: payment.subscription.planMonths,
            startDate: payment.subscription.startDate,
            dueDate: payment.subscription.dueDate,
          },
          amount: formatCurrency(payment.amount.toString()),
          method: payment.method,
        });

        const uploaded = await uploadInvoicePdf(pdfBuffer, payment.invoiceNumber);
        invoiceUrl = uploaded.url;

        await prisma.payment.update({
          where: { id: payment.id },
          data: { invoiceUrl },
        });
      } catch (genErr) {
        console.error("Failed to generate/upload invoice PDF during resend:", genErr);
      }
    }

    const channels = { whatsapp: false, email: false };
    const today = new Date();

    // 1. Send WhatsApp receipt
    if (invoiceUrl) {
      const waResult = await sendPaymentConfirmation({
        phoneE164: toE164(payment.member.phone),
        memberName: payment.member.fullName,
        amount: formatCurrency(payment.amount.toString()),
        invoiceUrl,
      });

      await prisma.whatsAppLog.create({
        data: {
          memberId: payment.member.id,
          type: "PAYMENT_CONFIRMATION",
          date: today,
          status: waResult.success ? "SENT" : "FAILED",
          waMessageId: waResult.success ? waResult.messageId : null,
          errorMessage: waResult.success ? null : waResult.error,
        },
      }).catch(() => {});

      if (waResult.success) channels.whatsapp = true;
    }

    // 2. Send Email receipt
    if (payment.member.email) {
      const emailResult = await sendEmailPaymentConfirmation({
        to: payment.member.email,
        memberName: payment.member.fullName,
        amount: formatCurrency(payment.amount.toString()),
        invoiceNumber: payment.invoiceNumber,
        planMonths: payment.subscription.planMonths,
        startDate: payment.subscription.startDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        dueDate: payment.subscription.dueDate.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        paymentDate: payment.paidAt.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        invoiceUrl,
        gymName,
      });

      await prisma.emailLog.create({
        data: {
          memberId: payment.member.id,
          type: "PAYMENT_CONFIRMATION",
          date: today,
          status: emailResult.success ? "SENT" : "FAILED",
          messageId: emailResult.success ? emailResult.messageId : null,
          errorMessage: emailResult.success ? null : emailResult.error,
        },
      }).catch(() => {});

      if (emailResult.success) channels.email = true;
    }

    const channelSummary = [
      channels.whatsapp ? "WhatsApp" : null,
      channels.email ? "Email" : null,
    ].filter(Boolean).join(" & ");

    return {
      success: true,
      data: {
        invoiceUrl,
        channels,
        message: channelSummary
          ? `Payment receipt resent successfully via ${channelSummary}.`
          : "Receipt dispatch attempted.",
      },
    };
  } catch (err) {
    return { success: false, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  if (err instanceof z.ZodError) return err.errors.map((e) => e.message).join(", ");
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
