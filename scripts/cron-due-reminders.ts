/**
 * Standalone cron runner for deployments NOT on Vercel (e.g. a VPS behind
 * PM2, a Docker container, Railway, Render). Vercel users should rely on
 * vercel.json's `crons` config instead and can ignore this file.
 *
 * Run with: `npx tsx scripts/cron-due-reminders.ts` (long-running process)
 * or invoke `runDueReminders()` once from an external scheduler (systemd
 * timer, GitHub Actions on a schedule, etc.) if you don't want a
 * long-running node-cron process.
 */
import cron from "node-cron";

async function runDueReminders() {
  const url = `${process.env.APP_BASE_URL}/api/cron/due-reminders`;
  console.log(`[cron] Triggering due-reminders job at ${new Date().toISOString()}`);

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const data = await res.json();
    console.log("[cron] Result:", data);
  } catch (err) {
    console.error("[cron] Failed to trigger due-reminders job:", err);
  }
}

// Runs daily at 09:00 server time — adjust the cron expression / timezone
// to match the gym's local time (node-cron uses server TZ by default).
cron.schedule("0 9 * * *", runDueReminders, {
  timezone: process.env.CRON_TIMEZONE ?? "Asia/Kolkata",
});

console.log("[cron] Due-reminders scheduler started (09:00 daily).");

// Allow a one-off manual trigger: `npx tsx scripts/cron-due-reminders.ts --now`
if (process.argv.includes("--now")) {
  runDueReminders();
}
