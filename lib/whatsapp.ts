import "server-only";

/**
 * Thin wrapper around the Meta WhatsApp Business Cloud API.
 *
 * IMPORTANT: WhatsApp requires pre-approved MESSAGE TEMPLATES for any
 * business-initiated conversation (i.e. anything not a reply within a
 * 24h customer-service window). You must create + get these approved
 * in Meta Business Manager BEFORE this code will work:
 *
 *   1. `payment_due_reminder`  — vars: {{1}} name, {{2}} due_date, {{3}} amount
 *   2. `payment_confirmation`  — vars: {{1}} name, {{2}} amount, {{3}} invoice_link
 *
 * Adjust WA_TEMPLATE_* env vars if your approved template names differ.
 */

const WA_API_VERSION = "v20.0";
const WA_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!;
const WA_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!;
const WA_BASE_URL = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_NUMBER_ID}/messages`;

type SendResult = { success: true; messageId: string } | { success: false; error: string };

async function sendTemplateMessage(
  toPhoneE164: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[]
): Promise<SendResult> {
  try {
    const res = await fetch(WA_BASE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WA_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toPhoneE164,
        type: "template",
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: "body",
              parameters: bodyParams.map((text) => ({ type: "text", text })),
            },
          ],
        },
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { success: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    }

    return { success: true, messageId: data.messages?.[0]?.id ?? "unknown" };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown network error" };
  }
}

export async function sendDueReminder(params: {
  phoneE164: string;
  memberName: string;
  dueDate: string; // pre-formatted, e.g. "25 Aug 2026"
  amount: string; // pre-formatted, e.g. "₹1,500"
}): Promise<SendResult> {
  return sendTemplateMessage(
    params.phoneE164,
    process.env.WA_TEMPLATE_DUE_REMINDER ?? "payment_due_reminder",
    "en",
    [params.memberName, params.dueDate, params.amount]
  );
}

export async function sendPaymentConfirmation(params: {
  phoneE164: string;
  memberName: string;
  amount: string;
  invoiceUrl: string;
}): Promise<SendResult> {
  return sendTemplateMessage(
    params.phoneE164,
    process.env.WA_TEMPLATE_PAYMENT_CONFIRMATION ?? "payment_confirmation",
    "en",
    [params.memberName, params.amount, params.invoiceUrl]
  );
}

/**
 * Normalizes a locally-entered phone number to E.164 for the WhatsApp API.
 * Adjust the default country code to your gym's locale.
 */
export function toE164(rawPhone: string, defaultCountryCode = "91"): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 10) return `${defaultCountryCode}${digits}`;
  return digits; // assume already includes country code
}
