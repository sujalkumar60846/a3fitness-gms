import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createLeadSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().min(8, "Phone number is required"),
  preferredTime: z.string().optional(),
  location: z.string().optional(),
  inquiryType: z.string().default("Free Trial Pass"),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createLeadSchema.parse(body);

    const lead = await prisma.lead.create({
      data: {
        fullName: parsed.fullName,
        email: parsed.email || null,
        phone: parsed.phone,
        preferredTime: parsed.preferredTime || null,
        location: parsed.location || null,
        inquiryType: parsed.inquiryType,
        notes: parsed.notes || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      success: true,
      data: lead,
      message: "Free pass claimed successfully! Details registered in admin leads.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.errors.map((e) => e.message).join(", ") },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to record trial pass claim" },
      { status: 500 }
    );
  }
}