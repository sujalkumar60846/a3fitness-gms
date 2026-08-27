import PDFDocument from "pdfkit";

export type InvoiceData = {
  invoiceNumber: string;
  paidAt: Date;
  gym: {
    name: string;
    address: string;
    phone: string;
    email: string;
    logoUrl?: string | null;
    gstNumber?: string | null;
  };
  member: {
    fullName: string;
    memberCode: string;
    phone: string;
  };
  subscription: {
    planMonths: number;
    startDate: Date;
    dueDate: Date;
  };
  amount: string; // e.g. "₹1,500.00" or "1,500.00"
  method: string;
};

function fmtDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function cleanCurrency(val: string): string {
  if (!val) return "Rs. 0.00";
  // Replace unicode ₹ with standard Rs. for crisp Helvetica compatibility in PDF
  return val.replace(/₹/g, "Rs. ").trim();
}

/**
 * Renders a crisp, branded, professional gym tax invoice directly to a Buffer.
 * High-performance, zero native/yoga dependencies, 100% reliable across all Node runtimes.
 */
export async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
        info: {
          Title: `Invoice #${data.invoiceNumber}`,
          Author: data.gym.name,
          Subject: "Gym Membership Tax Invoice",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err: Error) => reject(err));

      const primaryColor = "#18181b"; // Dark zinc
      const secondaryColor = "#71717a"; // Muted zinc
      const accentGreen = "#047857"; // Emerald

      // --- Header: Gym Info (Left) & Invoice Title (Right) ---
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .fillColor(primaryColor)
        .text(data.gym.name, 40, 40);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(secondaryColor)
        .text(data.gym.address, 40, 68)
        .text(`Phone: ${data.gym.phone}  |  Email: ${data.gym.email}`, 40, 82);

      if (data.gym.gstNumber) {
        doc.text(`GSTIN: ${data.gym.gstNumber}`, 40, 96);
      }

      // Invoice Title & Details (Right aligned)
      doc
        .font("Helvetica-Bold")
        .fontSize(22)
        .fillColor(primaryColor)
        .text("TAX INVOICE", 340, 40, { width: 215, align: "right" });

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(secondaryColor)
        .text(`Invoice #: ${data.invoiceNumber}`, 340, 68, { width: 215, align: "right" });

      doc
        .font("Helvetica")
        .fontSize(9)
        .text(`Date: ${fmtDate(data.paidAt)}`, 340, 82, { width: 215, align: "right" });

      // Divider
      doc
        .strokeColor("#e4e4e7")
        .lineWidth(1)
        .moveTo(40, 118)
        .lineTo(555, 118)
        .stroke();

      // --- Member & Subscription Info Cards ---
      const cardTop = 135;

      // Card 1: Billed To
      doc
        .roundedRect(40, cardTop, 245, 90, 6)
        .fillAndStroke("#fafafa", "#e4e4e7");

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(secondaryColor)
        .text("BILLED TO", 52, cardTop + 12);

      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(primaryColor)
        .text(data.member.fullName, 52, cardTop + 26);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(secondaryColor)
        .text(`Member ID: ${data.member.memberCode}`, 52, cardTop + 44)
        .text(`Phone: ${data.member.phone}`, 52, cardTop + 58);

      // Card 2: Subscription & Payment Details
      doc
        .roundedRect(305, cardTop, 250, 90, 6)
        .fillAndStroke("#fafafa", "#e4e4e7");

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(secondaryColor)
        .text("PLAN VALIDITY & PAYMENT", 317, cardTop + 12);

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(primaryColor)
        .text(`${data.subscription.planMonths} Month Membership Plan`, 317, cardTop + 26);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(secondaryColor)
        .text(`Validity: ${fmtDate(data.subscription.startDate)} to ${fmtDate(data.subscription.dueDate)}`, 317, cardTop + 44)
        .text(`Payment Mode: ${data.method === "ONLINE_RAZORPAY" ? "Online (Razorpay)" : data.method}`, 317, cardTop + 58);

      // --- Itemized Fee Table ---
      const tableTop = 245;

      // Table Header background
      doc
        .rect(40, tableTop, 515, 24)
        .fill("#f4f4f5");

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(primaryColor)
        .text("ITEM / DESCRIPTION", 52, tableTop + 7)
        .text("DURATION", 340, tableTop + 7, { width: 80, align: "center" })
        .text("AMOUNT", 430, tableTop + 7, { width: 110, align: "right" });

      // Table Row
      const rowTop = tableTop + 24;
      doc
        .rect(40, rowTop, 515, 36)
        .strokeColor("#e4e4e7")
        .lineWidth(1)
        .stroke();

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(primaryColor)
        .text(`Gym Membership Plan (${data.subscription.planMonths} Months)`, 52, rowTop + 8);

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(secondaryColor)
        .text(`Access valid from ${fmtDate(data.subscription.startDate)} to ${fmtDate(data.subscription.dueDate)}`, 52, rowTop + 20);

      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(primaryColor)
        .text(`${data.subscription.planMonths} Mo.`, 340, rowTop + 12, { width: 80, align: "center" });

      const cleanAmt = cleanCurrency(data.amount);
      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(primaryColor)
        .text(cleanAmt, 430, rowTop + 12, { width: 110, align: "right" });

      // --- Summary / Total Box ---
      const totalTop = rowTop + 55;

      doc
        .roundedRect(340, totalTop, 215, 50, 6)
        .fillAndStroke("#f8fafc", "#cbd5e1");

      doc
        .font("Helvetica-Bold")
        .fontSize(10)
        .fillColor(secondaryColor)
        .text("TOTAL PAID:", 355, totalTop + 18);

      doc
        .font("Helvetica-Bold")
        .fontSize(14)
        .fillColor(accentGreen)
        .text(cleanAmt, 430, totalTop + 16, { width: 110, align: "right" });

      // Status Stamp / Note
      doc
        .roundedRect(40, totalTop + 5, 120, 36, 4)
        .fillAndStroke("#ecfdf5", "#a7f3d0");

      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor(accentGreen)
        .text("[PAID & CONFIRMED]", 40, totalTop + 18, { width: 120, align: "center" });

      // --- Footer ---
      const footerY = 740;
      doc
        .strokeColor("#e4e4e7")
        .lineWidth(1)
        .moveTo(40, footerY)
        .lineTo(555, footerY)
        .stroke();

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(secondaryColor)
        .text(`Thank you for training with ${data.gym.name}!`, 40, footerY + 12, { align: "center", width: 515 })
        .text(`For billing queries, reach out at ${data.gym.phone} or ${data.gym.email}`, 40, footerY + 24, { align: "center", width: 515 })
        .text("This is an electronically generated receipt and requires no physical signature.", 40, footerY + 36, { align: "center", width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
