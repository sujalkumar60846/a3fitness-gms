import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await context.params;
    const cleanCode = code?.trim().toUpperCase();

    if (!cleanCode) {
      return NextResponse.json({ success: false, error: "Member code is required" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({
      where: { memberCode: cleanCode },
      select: {
        id: true,
        fullName: true,
        memberCode: true,
        photoUrl: true,
        email: true,
        phone: true,
        joiningDate: true,
        isActive: true,
        subscriptions: {
          orderBy: { dueDate: "desc" },
          take: 1,
          select: { planMonths: true, startDate: true, dueDate: true, status: true },
        },
        payments: {
          orderBy: { paidAt: "desc" },
          take: 5,
          select: { id: true, invoiceNumber: true, amount: true, paidAt: true, invoiceUrl: true },
        },
        attendances: {
          orderBy: { date: "desc" },
          take: 30,
          select: { id: true, date: true, checkInTime: true },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, error: `Member with code "${cleanCode}" not found in database.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: member,
      source: "live_gms",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch member details" },
      { status: 500 }
    );
  }
}