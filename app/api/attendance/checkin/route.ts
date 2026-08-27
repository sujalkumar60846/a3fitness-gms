import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { toCalendarDate } from "@/lib/utils/generators";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

/**
 * PUBLIC endpoint — hit by the member's own phone after scanning the gym
 * counter's QR code. No staff auth: the "secret" is that the QR points to
 * this page at all, plus the member must know their own Member Code.
 * Rate-limited below since it's public and unauthenticated (see lib/rate-limit.ts).
 */

const checkinSchema = z.object({
  memberCode: z.string().min(3).max(20),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const limited = await rateLimit(`checkin:${ip}`);
  if (!limited.success) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = checkinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "Invalid Member ID." }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { memberCode: parsed.data.memberCode.toUpperCase() },
  });

  if (!member) {
    return NextResponse.json({ success: false, error: "Member ID not found." }, { status: 404 });
  }
  if (!member.isActive) {
    return NextResponse.json({ success: false, error: "This membership is deactivated. Please see reception." }, { status: 403 });
  }

  // Optional: warn (but don't block) if their subscription is expired —
  // gyms may want to still let them in and flag it for staff follow-up.
  const activeSub = await prisma.subscription.findFirst({
    where: { memberId: member.id, status: "ACTIVE" },
    orderBy: { dueDate: "desc" },
  });
  const isExpired = !activeSub || activeSub.dueDate < new Date();

  try {
    const attendance = await prisma.attendance.create({
      data: {
        memberId: member.id,
        date: toCalendarDate(),
        method: "QR",
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        memberName: member.fullName,
        checkInTime: attendance.checkInTime,
        membershipExpired: isExpired,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { success: false, error: "You've already checked in today. See you tomorrow!" },
        { status: 409 }
      );
    }
    console.error("Check-in error:", err);
    return NextResponse.json({ success: false, error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
