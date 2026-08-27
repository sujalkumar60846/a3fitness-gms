import "server-only";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export { formatCurrency, formatDate, toCalendarDate, addMonths } from "./formatters";

// Unambiguous character pool (excludes 0, O, 1, I to prevent human mistyping)
const CODE_CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateRandomMemberCodeCandidate(prefix = "GYM", length = 6): string {
  let result = "";
  const randomBytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += CODE_CHARSET[randomBytes[i] % CODE_CHARSET.length];
  }
  return `${prefix}-${result}`;
}

/**
 * Generates an unpredictable random Member Code (e.g. GYM-7K9P2X) or validates a custom user-supplied code.
 * Defends against sequential guessing / code enumeration while allowing custom IDs for gyms with physical tags/RFID.
 */
export async function generateMemberCode(customCode?: string): Promise<string> {
  if (customCode && customCode.trim().length > 0) {
    const formatted = customCode.trim().toUpperCase();
    if (formatted.length < 3 || formatted.length > 30) {
      throw new Error("Custom Member Code must be between 3 and 30 characters.");
    }
    const existing = await prisma.member.findUnique({ where: { memberCode: formatted } });
    if (existing) {
      throw new Error(`Member Code "${formatted}" is already assigned to another member.`);
    }
    return formatted;
  }

  // Generate unpredictable unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateRandomMemberCodeCandidate();
    const existing = await prisma.member.findUnique({ where: { memberCode: candidate } });
    if (!existing) {
      return candidate;
    }
  }

  // Fallback if collision happens repeatedly
  return `GYM-${Date.now().toString(36).toUpperCase()}`;
}

/** e.g. INV-2026-000123 — resets numbering scope by year, matches typical accounting conventions. */
export async function generateInvoiceNumber(prefix = "INV"): Promise<string> {
  const year = new Date().getFullYear();
  const countThisYear = await prisma.payment.count({
    where: { invoiceNumber: { startsWith: `${prefix}-${year}-` } },
  });
  return `${prefix}-${year}-${String(countThisYear + 1).padStart(6, "0")}`;
}
