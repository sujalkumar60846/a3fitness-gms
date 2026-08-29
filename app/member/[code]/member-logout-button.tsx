"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { logoutMember } from "@/app/actions/member-public.actions";

export function MemberLogoutButton() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await logoutMember();
    router.push("/member");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loggingOut}
      title="Log out from this device"
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition shadow-2xs disabled:opacity-50"
    >
      {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5 text-zinc-500" />}
      <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
    </button>
  );
}
