import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { SidebarNav } from "@/components/shared/sidebar-nav";
import { MobileNav } from "@/components/shared/mobile-nav";
import { LogoutButton } from "@/components/shared/logout-button";

/**
 * Wraps every /dashboard/* route. This is the second layer of defense
 * (after middleware.ts) — if there's no session at all, bounce to /login
 * before rendering anything. Fine-grained per-page role checks (e.g.
 * staff-management being SUPER_ADMIN-only) still happen in each page.tsx,
 * since this layout only guarantees "some valid staff/admin session exists".
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white p-4 md:flex">
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-sm font-bold text-white">
            G
          </div>
          <span className="font-semibold text-zinc-900">Gym Admin</span>
        </div>

        <div className="flex-1">
          <SidebarNav role={session.role} />
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <Link
            href="/dashboard/account"
            className="mb-2 block rounded-lg px-3 py-1.5 transition-colors hover:bg-zinc-100"
            title="Manage your account & change password"
          >
            <p className="truncate text-sm font-medium text-zinc-900">{session.name}</p>
            <p className="text-xs capitalize text-zinc-500">{session.role.replace("_", " ").toLowerCase()}</p>
          </Link>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile top bar with sliding navigation drawer */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/95 backdrop-blur-xs px-4 py-3 md:hidden">
          <div className="flex items-center gap-2.5">
            <MobileNav role={session.role} userName={session.name} />
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-xs font-bold text-white">
              G
            </div>
            <span className="font-semibold text-sm text-zinc-900">Gym Admin</span>
          </div>
          <LogoutButton />
        </header>

        <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
