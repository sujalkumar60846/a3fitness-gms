import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasRole } from "@/lib/auth/rbac";
import { getBroadcastRecipients } from "@/app/actions/broadcast.actions";
import { prisma } from "@/lib/prisma";
import { BroadcastForm } from "./broadcast-form";

export default async function BroadcastPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!hasRole(session.role, ["SUPER_ADMIN", "ADMIN"])) {
    redirect("/dashboard/unauthorized");
  }

  const [recipients, gymSettings] = await Promise.all([
    getBroadcastRecipients(),
    prisma.gymSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Broadcast & Custom Messaging</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Compose and dispatch generic announcements, holiday schedules, or promotional renewal offers to all or selected members in one click.
        </p>
      </div>

      <BroadcastForm
        recipients={recipients}
        gymName={gymSettings?.gymName || "Your Gym"}
      />
    </div>
  );
}
