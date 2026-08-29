"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Save, Mail, Send, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateGymSettings, testEmailConfiguration } from "@/app/actions/settings.actions";

type Settings = {
  gymName: string;
  addressLine: string;
  phone: string;
  email: string;
  gstNumber: string;
  invoicePrefix: string;
  allowOnlineRenewals: boolean;
  allowMemberPhotoUpdate: boolean;
  defaultPricing: Record<string, number>;
};

const PLAN_DURATIONS = [1, 3, 6, 12] as const;

const EMPTY_SETTINGS: Settings = {
  gymName: "",
  addressLine: "",
  phone: "",
  email: "",
  gstNumber: "",
  invoicePrefix: "INV",
  allowOnlineRenewals: false,
  allowMemberPhotoUpdate: true,
  defaultPricing: {},
};

export function SettingsForm({ initialSettings }: { initialSettings: Settings | null }) {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(initialSettings ?? EMPTY_SETTINGS);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  function updateField<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  async function handleTestEmail() {
    if (!testEmailAddress || !testEmailAddress.includes("@")) {
      setTestResult({ type: "error", message: "Please enter a valid email address to send the test verification." });
      return;
    }
    setTestingEmail(true);
    setTestResult(null);

    const res = await testEmailConfiguration(testEmailAddress);
    setTestingEmail(false);

    setTestResult(
      res.success
        ? { type: "success", message: `Test email sent successfully! Message ID: ${res.data?.messageId}` }
        : { type: "error", message: `Test email failed: ${res.error}` }
    );
  }

  function updatePrice(months: number, value: string) {
    const num = value === "" ? undefined : Number(value);
    setSettings((prev) => {
      const next = { ...prev.defaultPricing };
      if (num === undefined || Number.isNaN(num)) delete next[String(months)];
      else next[String(months)] = num;
      return { ...prev, defaultPricing: next };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const res = await updateGymSettings(settings);
    setSubmitting(false);

    if (res.success) {
      setResult({ type: "success", message: "Settings saved successfully! Changes are permanently active." });
      router.refresh();
    } else {
      setResult({ type: "error", message: res.error });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gym Branding</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gymName">Gym name</Label>
            <Input
              id="gymName"
              required
              value={settings.gymName}
              onChange={(e) => updateField("gymName", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="addressLine">Address</Label>
            <Input
              id="addressLine"
              required
              value={settings.addressLine}
              onChange={(e) => updateField("addressLine", e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                required
                value={settings.phone}
                onChange={(e) => updateField("phone", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={settings.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gstNumber">GST number (optional)</Label>
              <Input
                id="gstNumber"
                value={settings.gstNumber}
                onChange={(e) => updateField("gstNumber", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invoicePrefix">Invoice prefix</Label>
              <Input
                id="invoicePrefix"
                required
                value={settings.invoicePrefix}
                onChange={(e) => updateField("invoicePrefix", e.target.value)}
                placeholder="INV"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suggested Plan Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-xs text-zinc-500">
            These amounts auto-fill the fee field when a plan duration is picked — staff and admins can
            still edit the amount for any individual member (discounts, corporate rates, etc.).
            Leave a field blank to skip suggesting a price for that duration.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {PLAN_DURATIONS.map((months) => (
              <div key={months} className="space-y-1.5">
                <Label htmlFor={`price-${months}`}>{months} month{months > 1 ? "s" : ""}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">₹</span>
                  <Input
                    id={`price-${months}`}
                    type="number"
                    min="0"
                    step="1"
                    className="pl-6"
                    value={settings.defaultPricing[String(months)] ?? ""}
                    onChange={(e) => updatePrice(months, e.target.value)}
                    placeholder="—"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Online Member Renewals (Razorpay)</CardTitle>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                settings.allowOnlineRenewals
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {settings.allowOnlineRenewals ? "Active / Enabled" : "Coming Soon / Disabled"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-500">
            Allow gym members to renew their memberships online from their self-service portal (<code>/member/[code]</code>) using Razorpay UPI, Cards, and Netbanking.
          </p>

          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <p className="text-sm font-medium text-zinc-900">Enable Member Self-Renewal</p>
              <p className="text-xs text-zinc-500">
                {settings.allowOnlineRenewals
                  ? "Members can currently renew their plan online via Razorpay."
                  : "Members will see a 'Coming Soon' notice on their portal and must renew in person."}
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.allowOnlineRenewals}
                onChange={(e) => updateField("allowOnlineRenewals", e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-zinc-300 peer-checked:bg-zinc-900 peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
            </label>
          </div>

          <div className="rounded-lg bg-zinc-100/80 p-3 text-xs text-zinc-600">
            <p className="font-semibold text-zinc-800">Prerequisites to accept live payments:</p>
            <p className="mt-1">
              Add your Razorpay API keys (<code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code>) in your environment variables (<code>.env</code>).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Member Portal Permissions (Photo Updates) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Member Portal Permissions</CardTitle>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                settings.allowMemberPhotoUpdate
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-rose-100 text-rose-800"
              }`}
            >
              {settings.allowMemberPhotoUpdate ? "Updates Allowed" : "Photo Updates Locked"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-500">
            Control whether gym members are permitted to upload or change their profile photos from their personal self-dashboard (<code>/member/[code]</code>).
          </p>

          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div>
              <p className="text-sm font-medium text-zinc-900">Allow Members to Update Photo</p>
              <p className="text-xs text-zinc-500">
                {settings.allowMemberPhotoUpdate
                  ? "Members can update their profile photo at any time from their personal dashboard."
                  : "Super Admin has stopped photo updates. Members cannot change photos from their portal."}
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={settings.allowMemberPhotoUpdate}
                onChange={(e) => updateField("allowMemberPhotoUpdate", e.target.checked)}
                className="peer sr-only"
              />
              <div className="h-6 w-11 rounded-full bg-zinc-300 peer-checked:bg-zinc-900 peer-focus:outline-none after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full"></div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Email & WhatsApp Notification System */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-zinc-700" /> Notifications & Messaging Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-zinc-500">
            Manage your automated member notifications for Welcome Onboarding, Payment Receipts, and Due Date Reminders.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* Email Status */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-600" /> Email Notifications
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  SMTP Ready
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Sends branded HTML welcome emails, payment receipts with PDF downloads, and renewal reminders.
              </p>
            </div>

            {/* WhatsApp Status */}
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-zinc-600" /> WhatsApp Cloud API
                </span>
                <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
                  Future Ready
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Connect Meta WhatsApp Cloud API credentials in <code>.env</code> anytime to activate instant WhatsApp receipts & reminders.
              </p>
            </div>
          </div>

          {/* Test Email Dispatcher */}
          <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-white p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-zinc-900">Verify Email Dispatcher (Test Email)</p>
              <p className="text-[11px] text-zinc-500">
                Send a live test verification email to any inbox to confirm that SMTP is working properly.
              </p>
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter recipient email (e.g. yourname@gmail.com)"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                className="text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={testingEmail}
                className="shrink-0 gap-1.5 text-xs"
              >
                {testingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Test Email
              </Button>
            </div>

            {testResult && (
              <div
                className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                  testResult.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
                }`}
              >
                {testResult.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {result && (
        <div
          className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ${
            result.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
          }`}
        >
          {result.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{result.message}</span>
        </div>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" /> Save settings
          </>
        )}
      </Button>
    </form>
  );
}
