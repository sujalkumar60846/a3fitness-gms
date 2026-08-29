import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { getGymAnalytics } from "@/app/actions/analytics.actions";
import { AnalyticsDashboardView } from "./analytics-view";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AnalyticsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, ["SUPER_ADMIN", "ADMIN", "STAFF"])) {
    redirect("/dashboard/unauthorized");
  }

  const analyticsData = await getGymAnalytics("30d");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Gym Analytics & Performance</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Real-time insights into membership retention, attendance traffic, billing trends, and revenue metrics.
          </p>
        </div>
      </div>

      <AnalyticsDashboardView initialData={analyticsData} currentUserRole={session.role} />
    </div>
  );
}
