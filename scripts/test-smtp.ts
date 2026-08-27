import { sendTestEmail } from "../lib/email";

async function main() {
  console.log("Testing Gmail SMTP with:", process.env.SMTP_USER);
  const res = await sendTestEmail("sujalkumar60846@gmail.com", "Pradeep Gym");
  console.log("RESULT:", JSON.stringify(res));
}

main().catch(console.error);
