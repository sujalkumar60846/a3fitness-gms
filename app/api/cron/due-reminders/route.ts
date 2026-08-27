import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDueReminder, toE164 } from "@/lib/whatsapp";
import { sendEmailDueReminder } from "@/lib/email";
import { formatCurrency, toCalendarDate } from "@/lib/utils/generators";

export const maxDuration = 60; // seconds — bump on Vercel Pro if member count is large

/**
 * Triggered daily at 09:00 by Vercel Cron (see vercel.json) or, for
 * non-Vercel hosts, by scripts/cron-due-reminders.ts under node-cron/PM2.
 *
 * Finds members whose current ACTIVE subscription's dueDate falls within
 * [today, today+3days], and sends WhatsApp and Email reminders — with
 * idempotency guards (WhatsAppLog & EmailLog @@unique([memberId, type, date]))
 * so retried or duplicate cron runs never double-notify.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = toCalendarDate();
  const windowEnd = new Date(today);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 3);
  windowEnd.setUTCHours(23, 59, 59, 999);

  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      dueDate: { gte: today, lte: windowEnd },
    },
    include: { member: true },
  });

  const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
  const gymName = gymSettings?.gymName || "Our Gym";
  const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

  const results = {
    whatsApp: { sent: 0, skipped: 0, failed: 0 },
    email: { sent: 0, skipped: 0, failed: 0 },
  };

  for (const sub of dueSubscriptions) {
    if (!sub.member.isActive) {
      results.whatsApp.skipped++;
      results.email.skipped++;
      continue;
    }

    const formattedDueDate = sub.dueDate.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    const formattedAmount = formatCurrency(sub.feeAmount.toString());
    const payOnlineUrl = `${appBaseUrl}/member/${sub.member.memberCode}`;

    // 1. WhatsApp Reminder with idempotency guard
    const alreadyLoggedWA = await prisma.whatsAppLog.findUnique({
      where: {
        memberId_type_date: { memberId: sub.member.id, type: "DUE_REMINDER", date: today },
      },
    });

    if (alreadyLoggedWA) {
      results.whatsApp.skipped++;
    } else {
      const waResult = await sendDueReminder({
        phoneE164: toE164(sub.member.phone),
        memberName: sub.member.fullName,
        dueDate: formattedDueDate,
        amount: formattedAmount,
      });

      await prisma.whatsAppLog.create({
        data: {
          memberId: sub.member.id,
          type: "DUE_REMINDER",
          date: today,
          status: waResult.success ? "SENT" : "FAILED",
          waMessageId: waResult.success ? waResult.messageId : null,
          errorMessage: waResult.success ? null : waResult.error,
        },
      });

      if (waResult.success) results.whatsApp.sent++;
      else results.whatsApp.failed++;
    }

    // 2. Email Reminder with idempotency guard
    if (sub.member.email) {
      const alreadyLoggedEmail = await prisma.emailLog.findUnique({
        where: {
          memberId_type_date: { memberId: sub.member.id, type: "DUE_REMINDER", date: today },
        },
      });

      if (alreadyLoggedEmail) {
        results.email.skipped++;
      } else {
        const emailResult = await sendEmailDueReminder({
          to: sub.member.email,
          memberName: sub.member.fullName,
          dueDate: formattedDueDate,
          amount: formattedAmount,
          gymName,
          payOnlineUrl,
        });

        await prisma.emailLog.create({
          data: {
            memberId: sub.member.id,
            type: "DUE_REMINDER",
            date: today,
            status: emailResult.success ? "SENT" : "FAILED",
            messageId: emailResult.success ? emailResult.messageId : null,
            errorMessage: emailResult.success ? null : emailResult.error,
          },
        });

        if (emailResult.success) results.email.sent++;
        else results.email.failed++;
      }
    } else {
      results.email.skipped++;
    }
  }

  return NextResponse.json({
    success: true,
    checkedAt: new Date().toISOString(),
    totalDue: dueSubscriptions.length,
    ...results,
  });
}
