"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, ClipboardCheck, Wallet, ShieldCheck, Settings, BarChart3, Send, UserCog, UserCheck } from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils/cn";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Users;
  roles: Role[]; // who sees this link — mirrors lib/auth/rbac.ts PERMISSIONS
};

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/members", label: "Members", icon: Users, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/leads", label: "Trial Leads", icon: UserCheck, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/payments", label: "Payments", icon: Wallet, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/broadcast", label: "Broadcast Messages", icon: Send, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/dashboard/staff-management", label: "Staff Management", icon: ShieldCheck, roles: ["SUPER_ADMIN", "ADMIN"] },
  { href: "/dashboard/account", label: "My Account", icon: UserCog, roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, roles: ["SUPER_ADMIN"] },
];

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="space-y-1">
      {visibleItems.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
