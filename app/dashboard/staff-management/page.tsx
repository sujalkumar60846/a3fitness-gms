import Link from "next/link";
import { redirect } from "next/navigation";
import { UserPlus, ShieldCheck } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { listStaff } from "@/app/actions/staff.actions";
import { StaffRow } from "@/components/dashboard/staff-row";
import { Button } from "@/components/ui/button";

export default async function StaffManagementPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Page-level check on top of middleware — this route is accessible to SUPER_ADMIN and ADMIN.
  if (!hasRole(session.role, ["SUPER_ADMIN", "ADMIN"])) redirect("/dashboard/unauthorized");

  const staff = await listStaff();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-zinc-900">
            <ShieldCheck className="h-6 w-6" /> Staff Management
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {staff.length} account{staff.length === 1 ? "" : "s"}
          </p>
        </div>
        {session.role === "SUPER_ADMIN" && (
          <Button asChild>
            <Link href="/dashboard/staff-management/new">
              <UserPlus className="mr-1.5 h-4 w-4" /> Add staff
            </Link>
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-xs">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Last login</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <StaffRow
                key={s.id}
                staff={s}
                isCurrentUser={s.id === session.userId}
                currentUserRole={session.role}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
