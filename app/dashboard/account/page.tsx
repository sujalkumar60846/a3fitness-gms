import { redirect } from "next/navigation";
import { User, Mail, Phone, Shield, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ChangePasswordForm } from "./change-password-form";
import { formatDate } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) redirect("/login");

  const roleLabelMap: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    STAFF: "Desk Staff",
  };

  const roleBadgeColor: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-800 border-purple-200",
    ADMIN: "bg-blue-100 text-blue-800 border-blue-200",
    STAFF: "bg-zinc-100 text-zinc-800 border-zinc-200",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">My Account</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage your personal profile and account security settings.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 text-lg font-bold text-white mb-2">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <CardTitle className="text-base font-semibold text-zinc-900">{user.name}</CardTitle>
              <CardDescription className="text-xs">{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 text-sm">
              <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Shield className="h-3.5 w-3.5" /> Role
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium ${
                    roleBadgeColor[user.role] ?? "bg-zinc-100 text-zinc-800 border-zinc-200"
                  }`}
                >
                  {roleLabelMap[user.role] ?? user.role}
                </span>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Status
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                  {user.status}
                </span>
              </div>

              {user.phone && (
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </span>
                  <span className="text-xs text-zinc-800">{user.phone}</span>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Calendar className="h-3.5 w-3.5" /> Joined
                </span>
                <span className="text-xs text-zinc-800">{formatDate(user.createdAt)}</span>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock className="h-3.5 w-3.5" /> Last Login
                </span>
                <span className="text-xs text-zinc-800">
                  {user.lastLoginAt ? formatDate(user.lastLoginAt) : "First Session"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Change Password Card */}
        <div className="md:col-span-2">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
