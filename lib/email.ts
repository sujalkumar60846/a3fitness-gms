import "server-only";
import nodemailer from "nodemailer";

/**
 * Robust email notification system for Gym Management System.
 * Supports SMTP (Gmail, SendGrid, Amazon SES, Brevo, Mailgun, Custom SMTP).
 * Falls back to graceful console logging in development if SMTP is not configured.
 */

type EmailResult = { success: true; messageId: string } | { success: false; error: string };

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === "true" || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailResult> {
  try {
    const transporter = getTransporter();

    if (!transporter) {
      console.log(
        `[Email Notification - Sim Mode] To: ${options.to} | Subject: "${options.subject}"`
      );
      return { success: true, messageId: `mock-email-${Date.now()}` };
    }

    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "Gym Notifications <no-reply@yourgym.com>";

    const info = await transporter.sendMail({
      from: fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      headers: {
        "X-Mailer": "Gym Management System",
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
    });

    return { success: true, messageId: info.messageId || "sent" };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to send email";
    console.error("[Email Dispatch Error]:", errorMsg);
    return { success: false, error: errorMsg };
  }
}

export async function sendEmailPaymentConfirmation(params: {
  to: string;
  memberName: string;
  amount: string;
  invoiceNumber: string;
  planMonths: number;
  startDate: string;
  dueDate: string;
  paymentDate?: string;
  invoiceUrl?: string | null;
  gymName: string;
}): Promise<EmailResult> {
  const subject = `Payment Received — Invoice #${params.invoiceNumber} | ${params.gymName}`;
  const paidDateDisplay = params.paymentDate || new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; }
          .header { background: #18181b; color: #ffffff; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .content { padding: 28px 24px; }
          .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; }
          .details-card { background: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; padding: 18px; margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .row-label { color: #71717a; }
          .row-value { font-weight: 600; color: #18181b; }
          .total-row { border-top: 1px solid #e4e4e7; margin-top: 12px; padding-top: 12px; font-size: 16px; }
          .button { display: block; text-align: center; background: #18181b; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 500; font-size: 14px; margin-top: 24px; }
          .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #a1a1aa; border-top: 1px solid #f4f4f5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${params.gymName}</h1>
          </div>
          <div class="content">
            <span class="badge">✓ Payment Confirmed</span>
            <p>Hi <strong>${params.memberName}</strong>,</p>
            <p>Thank you for your payment! We have successfully recorded your membership fee.</p>
            
            <div class="details-card">
              <div class="row">
                <span class="row-label">Member Name</span>
                <span class="row-value">${params.memberName}</span>
              </div>
              <div class="row">
                <span class="row-label">Payment Date</span>
                <span class="row-value">${paidDateDisplay}</span>
              </div>
              <div class="row">
                <span class="row-label">Invoice Number</span>
                <span class="row-value">${params.invoiceNumber}</span>
              </div>
              <div class="row">
                <span class="row-label">Plan Duration</span>
                <span class="row-value">${params.planMonths} Month${params.planMonths > 1 ? "s" : ""}</span>
              </div>
              <div class="row">
                <span class="row-label">Plan Validity</span>
                <span class="row-value">${params.startDate} to ${params.dueDate}</span>
              </div>
              <div class="row total-row">
                <span class="row-label">Amount Paid</span>
                <span class="row-value">${params.amount}</span>
              </div>
            </div>

            ${
              params.invoiceUrl
                ? `<a href="${params.invoiceUrl}" class="button" target="_blank">Download Tax Invoice PDF</a>`
                : ""
            }
          </div>
          <div class="footer">
            <p>Thank you for training with ${params.gymName}.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `Hi ${params.memberName},\n\nThank you for your payment of ${params.amount} on ${paidDateDisplay} to ${params.gymName}.\nInvoice Number: ${params.invoiceNumber}\nPlan: ${params.planMonths} Month(s) (${params.startDate} to ${params.dueDate})\n${params.invoiceUrl ? `Download Invoice: ${params.invoiceUrl}\n` : ""}\nBest regards,\n${params.gymName}`;

  return sendMail({ to: params.to, subject, html, text });
}

export async function sendEmailDueReminder(params: {
  to: string;
  memberName: string;
  dueDate: string;
  amount: string;
  gymName: string;
  payOnlineUrl?: string | null;
}): Promise<EmailResult> {
  const subject = `Membership Due Soon — ${params.gymName}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; }
          .header { background: #18181b; color: #ffffff; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .content { padding: 28px 24px; }
          .badge { display: inline-block; background: #fffbeb; color: #b45309; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; }
          .details-card { background: #fafafa; border: 1px solid #f4f4f5; border-radius: 8px; padding: 18px; margin: 20px 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .row-label { color: #71717a; }
          .row-value { font-weight: 600; color: #18181b; }
          .button { display: block; text-align: center; background: #18181b; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 500; font-size: 14px; margin-top: 24px; }
          .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #a1a1aa; border-top: 1px solid #f4f4f5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${params.gymName}</h1>
          </div>
          <div class="content">
            <span class="badge">⏳ Renewal Notice</span>
            <p>Hi <strong>${params.memberName}</strong>,</p>
            <p>This is a friendly reminder that your gym membership is expiring soon.</p>
            
            <div class="details-card">
              <div class="row">
                <span class="row-label">Due Date</span>
                <span class="row-value">${params.dueDate}</span>
              </div>
              <div class="row">
                <span class="row-label">Renewal Fee</span>
                <span class="row-value">${params.amount}</span>
              </div>
            </div>

            <p>Renew on time to continue uninterrupted access to your fitness sessions!</p>

            ${
              params.payOnlineUrl
                ? `<a href="${params.payOnlineUrl}" class="button" target="_blank">Renew & Pay Online with Razorpay</a>`
                : ""
            }
          </div>
          <div class="footer">
            <p>Thank you for choosing ${params.gymName}.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `Hi ${params.memberName},\n\nYour gym membership at ${params.gymName} is due for renewal on ${params.dueDate}.\nRenewal Amount: ${params.amount}\n${params.payOnlineUrl ? `Pay Online: ${params.payOnlineUrl}\n` : ""}\nBest regards,\n${params.gymName}`;

  return sendMail({ to: params.to, subject, html, text });
}

export async function sendEmailWelcome(params: {
  to: string;
  memberName: string;
  memberCode: string;
  gymName: string;
  portalUrl: string;
}): Promise<EmailResult> {
  const subject = `Welcome to ${params.gymName}! Your Member Code is ${params.memberCode}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; }
          .header { background: #18181b; color: #ffffff; padding: 28px 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
          .content { padding: 28px 24px; }
          .code-box { background: #f4f4f5; border: 2px dashed #d4d4d8; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0; }
          .code-label { font-size: 11px; text-transform: uppercase; color: #71717a; letter-spacing: 1px; font-weight: 600; margin-bottom: 4px; }
          .code-val { font-size: 24px; font-weight: 700; color: #18181b; letter-spacing: 2px; }
          .button { display: block; text-align: center; background: #18181b; color: #ffffff !important; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 500; font-size: 14px; margin-top: 24px; }
          .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #a1a1aa; border-top: 1px solid #f4f4f5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ${params.gymName}!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${params.memberName}</strong>,</p>
            <p>Welcome to our fitness community! Your membership has been successfully registered.</p>
            
            <div class="code-box">
              <div class="code-label">Your Unique Member ID</div>
              <div class="code-val">${params.memberCode}</div>
            </div>

            <p><strong>How to use your Member ID:</strong></p>
            <ul>
              <li>Scan the QR code at our reception counter and enter your ID to check in.</li>
              <li>Use it anytime to access your personal dashboard, track attendance, and download receipts.</li>
            </ul>

            <a href="${params.portalUrl}" class="button" target="_blank">Open My Member Dashboard</a>
          </div>
          <div class="footer">
            <p>Need assistance? Please contact our reception desk.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `Hi ${params.memberName},\n\nWelcome to ${params.gymName}!\nYour Member Code is: ${params.memberCode}\n\nAccess your dashboard: ${params.portalUrl}\n\nBest regards,\n${params.gymName}`;

  return sendMail({ to: params.to, subject, html, text });
}

export async function sendCustomBroadcastEmail(params: {
  to: string;
  memberName: string;
  subject: string;
  messageHtml: string;
  gymName: string;
}): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
          .container { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e4e4e7; }
          .header { background: #18181b; color: #ffffff; padding: 24px; text-align: center; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 600; }
          .content { padding: 28px 24px; line-height: 1.6; font-size: 15px; color: #27272a; }
          .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #a1a1aa; border-top: 1px solid #f4f4f5; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${params.gymName}</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${params.memberName}</strong>,</p>
            ${params.messageHtml}
          </div>
          <div class="footer">
            <p>Message sent by ${params.gymName} administration.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `Hi ${params.memberName},\n\n${params.messageHtml.replace(/<[^>]+>/g, "")}\n\nBest regards,\n${params.gymName}`;

  return sendMail({ to: params.to, subject: params.subject, html, text });
}

export async function sendTestEmail(targetEmail: string, gymName = "Gym Management"): Promise<EmailResult> {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return {
      success: false,
      error: `Missing SMTP credentials in .env: ${!host ? "SMTP_HOST " : ""}${!user ? "SMTP_USER " : ""}${!pass ? "SMTP_PASS" : ""}. Please fill all required variables.`,
    };
  }

  const subject = `[Test Email] Notification System Verification — ${gymName}`;
  const now = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; padding: 28px; }
          .badge { display: inline-block; background: #ecfdf5; color: #047857; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 9999px; }
        </style>
      </head>
      <body>
        <div class="container">
          <span class="badge">✓ SMTP Connected</span>
          <h2 style="margin-top: 12px;">Email Dispatch Test Successful!</h2>
          <p>Your SMTP email configuration is active and working properly.</p>
          <p style="font-size: 13px; color: #71717a;">Dispatched at: <strong>${now}</strong></p>
          <p style="font-size: 13px; color: #71717a;">From: <strong>${gymName}</strong></p>
        </div>
      </body>
    </html>
  `;

  return sendMail({
    to: targetEmail,
    subject,
    html,
    text: `Your SMTP configuration is active and working properly. Dispatched at: ${now} from ${gymName}`,
  });
}

