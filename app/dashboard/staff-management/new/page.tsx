import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { AddStaffForm } from "./add-staff-form";

export default async function NewStaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, ["SUPER_ADMIN"])) redirect("/dashboard/unauthorized");

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-semibold text-zinc-900">Add Staff or Admin</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Create a login for a new team member. Share the temporary password with them securely —
        ask them to change it after their first login.
      </p>
      <div className="mt-6">
        <AddStaffForm />
      </div>
    </div>
  );
}
