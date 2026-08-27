"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/rbac";
import { sendCustomBroadcastEmail } from "@/lib/email";

type ActionResult<T = undefined> = { success: true; data?: T } | { success: false; error: string };

const broadcastSchema = z.object({
  audience: z.enum(["ALL_ACTIVE", "ALL_EXPIRED", "ALL_MEMBERS", "SELECTED"]),
  memberIds: z.array(z.string()).optional(),
  subject: z.string().min(2, "Subject is required").max(150),
  messageBody: z.string().min(5, "Message content is required"),
});

export async function getBroadcastRecipients() {
  await requirePermission("member:view");
  const now = new Date();

  const members = await prisma.member.findMany({
    where: { isActive: true },
    include: {
      subscriptions: { orderBy: { dueDate: "desc" }, take: 1 },
    },
    orderBy: { fullName: "asc" },
  });

  return members.map((m) => {
    const latest = m.subscriptions[0];
    const isExpired = latest ? latest.dueDate < now : true;
    return {
      id: m.id,
      fullName: m.fullName,
      memberCode: m.memberCode,
      email: m.email,
      phone: m.phone,
      isExpired,
      hasEmail: !!m.email,
    };
  });
}

export async function sendBroadcastMessage(
  input: z.infer<typeof broadcastSchema>
): Promise<
  ActionResult<{
    totalTargeted: number;
    totalSent: number;
    totalFailed: number;
    recipients: { name: string; email: string; status: "SENT" | "FAILED" | "NO_EMAIL" }[];
  }>
> {
  try {
    await requirePermission("settings:manage");
    const parsed = broadcastSchema.parse(input);

    const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });
    const gymName = gymSettings?.gymName || "Your Gym";

    const now = new Date();
    let whereClause: any = { isActive: true };

    if (parsed.audience === "SELECTED" && parsed.memberIds && parsed.memberIds.length > 0) {
      whereClause = { id: { in: parsed.memberIds } };
    }

    const members = await prisma.member.findMany({
      where: whereClause,
      include: {
        subscriptions: { orderBy: { dueDate: "desc" }, take: 1 },
      },
    });

    let targetList = members;
    if (parsed.audience === "ALL_ACTIVE") {
      targetList = members.filter((m) => {
        const latest = m.subscriptions[0];
        return latest && latest.dueDate >= now;
      });
    } else if (parsed.audience === "ALL_EXPIRED") {
      targetList = members.filter((m) => {
        const latest = m.subscriptions[0];
        return !latest || latest.dueDate < now;
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const recipientLogs: { name: string; email: string; status: "SENT" | "FAILED" | "NO_EMAIL" }[] = [];

    for (const member of targetList) {
      if (!member.email) {
        recipientLogs.push({ name: member.fullName, email: "No Email Recorded", status: "NO_EMAIL" });
        continue;
      }

      // Replace template variables
      const personalizedBody = parsed.messageBody
        .replace(/{name}/g, member.fullName)
        .replace(/{memberCode}/g, member.memberCode)
        .replace(/{gymName}/g, gymName)
        .replace(/{phone}/g, member.phone)
        .replace(/\n/g, "<br/>");

      const personalizedSubject = parsed.subject
        .replace(/{name}/g, member.fullName)
        .replace(/{memberCode}/g, member.memberCode)
        .replace(/{gymName}/g, gymName);

      const result = await sendCustomBroadcastEmail({
        to: member.email,
        memberName: member.fullName,
        subject: personalizedSubject,
        messageHtml: personalizedBody,
        gymName,
      });

      if (result.success) {
        sentCount++;
        recipientLogs.push({ name: member.fullName, email: member.email, status: "SENT" });
      } else {
        failedCount++;
        recipientLogs.push({ name: member.fullName, email: member.email, status: "FAILED" });
      }
    }

    return {
      success: true,
      data: {
        totalTargeted: targetList.length,
        totalSent: sentCount,
        totalFailed: failedCount,
        recipients: recipientLogs,
      },
    };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.errors.map((e) => e.message).join(", ") };
    if (err instanceof Error) return { success: false, error: err.message };
    return { success: false, error: "Something went wrong." };
  }
}
