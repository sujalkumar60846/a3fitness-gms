import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { listLeads } from "@/app/actions/lead.actions";
import { LeadsView } from "./leads-view";

export default async function LeadsDashboardPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, ["SUPER_ADMIN", "ADMIN", "STAFF"])) {
    redirect("/dashboard/unauthorized");
  }

  const leads = await listLeads();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Free Pass & Trial Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Prospects who claimed a 3-Day Free VIP Pass on the website. Available to Super Admin, Admin, and Staff.
          </p>
        </div>
      </div>

      <LeadsView initialLeads={leads} />
    </div>
  );
}