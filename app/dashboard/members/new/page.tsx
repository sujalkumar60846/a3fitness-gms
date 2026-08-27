import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { getGymSettings } from "@/app/actions/settings.actions";
import { AddMemberForm } from "./add-member-form";

/**
 * Accessible to SUPER_ADMIN, ADMIN, and STAFF alike — matches the
 * "member:create" permission in lib/auth/rbac.ts. This page-level check is
 * belt-and-suspenders on top of middleware.ts (edge) and requirePermission()
 * inside registerMember() (the actual enforcement point) — three layers,
 * so removing any one of them still leaves the feature secure.
 */
export default async function NewMemberPage({
  searchParams,
}: {
  searchParams?: Promise<{ name?: string; phone?: string; email?: string; leadId?: string }>;
}) {
  const session = await getSession();

  if (!session) redirect("/login");
  if (!hasRole(session.role, ["SUPER_ADMIN", "ADMIN", "STAFF"])) {
    redirect("/dashboard/unauthorized");
  }

  const resolvedParams = searchParams ? await searchParams : {};
  const settings = await getGymSettings();
  const defaultPricing = (settings?.defaultPricing as Record<string, number>) ?? {};

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Register a New Member</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Available to Super Admin, Admin, and Staff — fill in the member&apos;s details and photo below.
        </p>
      </div>

      <AddMemberForm
        currentUser={{ name: session.name, role: session.role }}
        defaultPricing={defaultPricing}
        initialValues={{
          fullName: resolvedParams.name,
          phone: resolvedParams.phone,
          email: resolvedParams.email,
        }}
      />
    </div>
  );
}
