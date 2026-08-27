import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePdf } from "@/lib/pdf/invoice";
import { formatCurrency } from "@/lib/utils/formatters";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ invoiceNumber: string }> }
) {
  try {
    const { invoiceNumber } = await params;
    if (!invoiceNumber) {
      return new NextResponse("Invoice number is required", { status: 400 });
    }

    const payment = await prisma.payment.findUnique({
      where: { invoiceNumber },
      include: {
        member: true,
        subscription: true,
      },
    });

    if (!payment) {
      return new NextResponse("Invoice not found", { status: 404 });
    }

    const gymSettings = await prisma.gymSettings.findUnique({ where: { id: "singleton" } });

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

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice-${payment.invoiceNumber}.pdf"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Error generating dynamic invoice PDF:", err);
    return new NextResponse("Failed to generate invoice PDF", { status: 500 });
  }
}
