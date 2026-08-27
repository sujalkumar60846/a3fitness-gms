import Link from "next/link";
import { UserPlus, ClipboardCheck, Wallet, ShieldCheck, BarChart3 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardHomePage() {
  const session = await getSession();
  if (!session) return null; // layout already redirects; this satisfies TS

  const quickActions = [
    { href: "/dashboard/analytics", label: "Gym Analytics & Revenue", icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN"] },
    { href: "/dashboard/members/new", label: "Add Member", icon: UserPlus, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
    { href: "/dashboard/attendance", label: "Mark Attendance", icon: ClipboardCheck, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
    { href: "/dashboard/payments", label: "Record Payment", icon: Wallet, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
    { href: "/dashboard/staff-management", label: "Manage Staff", icon: ShieldCheck, roles: ["SUPER_ADMIN"] },
  ].filter((a) => hasRole(session.role, a.roles as never));

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-zinc-900">
        Welcome back, {session.name.split(" ")[0]}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">Here&apos;s what you can do right now.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <Card className="transition-shadow hover:shadow-md hover:border-zinc-300">
                <CardContent className="flex items-center gap-3 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100">
                    <Icon className="h-5 w-5 text-zinc-700" />
                  </div>
                  <span className="font-medium text-zinc-900">{action.label}</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
