import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";

/**
 * Razorpay Payment Gateway helper for Gym Management System.
 * Supports online fee payment by members, order creation, and HMAC SHA256 signature verification.
 */

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

let razorpayClient: Razorpay | null = null;
if (key_id && key_secret) {
  razorpayClient = new Razorpay({
    key_id,
    key_secret,
  });
}

export function getRazorpayKeyId(): string {
  return process.env.RAZORPAY_KEY_ID || "";
}

export async function createRazorpayOrder(params: {
  amountInRupees: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ success: true; orderId: string; amount: number; currency: string } | { success: false; error: string }> {
  try {
    const amountInPaise = Math.round(params.amountInRupees * 100);

    if (!razorpayClient || !key_id || !key_secret) {
      console.warn("[Razorpay] Warning: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not configured. Using simulated order.");
      return {
        success: true,
        orderId: `order_sim_${Date.now()}`,
        amount: amountInPaise,
        currency: "INR",
      };
    }

    const order = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes,
    });

    return {
      success: true,
      orderId: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to create Razorpay order";
    console.error("[Razorpay Order Error]:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!key_secret) {
    // If not configured (dev mode), accept mock orders
    if (params.orderId.startsWith("order_sim_")) return true;
    return false;
  }

  const generatedSignature = crypto
    .createHmac("sha256", key_secret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  return generatedSignature === params.signature;
}
