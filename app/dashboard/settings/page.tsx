import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { getGymSettings } from "@/app/actions/settings.actions";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, ["SUPER_ADMIN"])) redirect("/dashboard/unauthorized");

  const settings = await getGymSettings();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Gym Settings</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Branding shown on invoices, plus suggested prices that auto-fill (but don&apos;t lock) the fee
        field when registering members or recording payments.
      </p>
      <div className="mt-6">
        <SettingsForm
          initialSettings={
            settings
              ? {
                  gymName: settings.gymName,
                  addressLine: settings.addressLine,
                  phone: settings.phone,
                  email: settings.email,
                  gstNumber: settings.gstNumber ?? "",
                  invoicePrefix: settings.invoicePrefix,
                  allowOnlineRenewals: settings.allowOnlineRenewals ?? false,
                  allowMemberPhotoUpdate: settings.allowMemberPhotoUpdate ?? true,
                  defaultPricing: (settings.defaultPricing as Record<string, number>) ?? {},
                }
              : null
          }
        />
      </div>
    </div>
  );
}
