"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Users, ClipboardCheck, Wallet, ShieldCheck, Settings, BarChart3, Send, UserCog, LogOut, UserCheck } from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils/cn";
import { LogoutButton } from "./logout-button";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Users;
  roles: Role[];
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/analytics", label: "Analytics & Reports", icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/members", label: "Members Directory", icon: Users, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/leads", label: "Trial Leads", icon: UserCheck, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/attendance", label: "Attendance & QR", icon: ClipboardCheck, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/payments", label: "Payments & Invoices", icon: Wallet, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/broadcast", label: "Broadcast Messages", icon: Send, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/dashboard/staff-management", label: "Staff Accounts", icon: ShieldCheck, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/dashboard/account", label: "My Account", icon: UserCog, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/settings", label: "Gym Settings", icon: Settings, roles: ["SUPER_ADMIN"] },
];

export function MobileNav({
  role,
  userName,
}: {
  role: Role;
  userName: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100 focus:outline-none"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-zinc-900/60 backdrop-blur-xs transition-opacity md:hidden"
        />
      )}

      {/* Slide-over Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-200 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-sm font-bold text-white shadow-xs">
              G
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-900">Gym Admin</p>
              <p className="text-[11px] text-zinc-400 capitalize">{role.replace("_", " ").toLowerCase()}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 focus:outline-none"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Account Snippet */}
        <div className="border-b border-zinc-100 bg-zinc-50/70 p-3.5">
          <Link
            href="/dashboard/account"
            className="block rounded-lg p-2 transition-colors hover:bg-zinc-100"
          >
            <p className="truncate text-xs font-semibold text-zinc-900">{userName}</p>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">Manage Account & Password →</p>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-zinc-900 text-white font-semibold shadow-xs"
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Drawer Footer */}
        <div className="border-t border-zinc-100 p-4">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
