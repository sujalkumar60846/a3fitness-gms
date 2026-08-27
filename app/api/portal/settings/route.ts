import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const settings = await prisma.gymSettings.findUnique({
      where: { id: "singleton" },
      select: {
        gymName: true,
        defaultPricing: true,
        allowOnlineRenewals: true,
        allowMemberPhotoUpdate: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: settings || {
        gymName: "A3Fitness Gym & Spa",
        defaultPricing: { "1": 1299, "3": 3300, "6": 6000, "12": 10800 },
        allowOnlineRenewals: false,
        allowMemberPhotoUpdate: true,
      },
    });
  } catch (err) {
    return NextResponse.json({
      success: true,
      data: {
        gymName: "A3Fitness Gym & Spa",
        defaultPricing: { "1": 1299, "3": 3300, "6": 6000, "12": 10800 },
        allowOnlineRenewals: false,
        allowMemberPhotoUpdate: true,
      },
    });
  }
}