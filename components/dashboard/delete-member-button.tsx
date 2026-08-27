"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMember } from "@/app/actions/member.actions";

export function DeleteMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete ${memberName}? This permanently removes their attendance, payment, and subscription history. This cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    const res = await deleteMember(memberId);
    setLoading(false);

    if (res.success) {
      router.push("/dashboard/members");
      router.refresh();
    } else {
      // Also covers the case where a STAFF role somehow reaches this button —
      // the server action's requirePermission("member:delete") will reject
      // it and the error surfaces here rather than failing silently.
      alert(res.error);
    }
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={loading}>
      {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
      Delete member
    </Button>
  );
}
