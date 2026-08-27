"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Snowflake, PlayCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleMemberActive } from "@/app/actions/member.actions";

export function FreezeMemberButton({
  memberId,
  memberName,
  isActive,
}: {
  memberId: string;
  memberName: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    const actionWord = isActive ? "Freeze / Deactivate" : "Unfreeze / Reactivate";
    const promptMessage = isActive
      ? `Freeze ${memberName}'s membership? When frozen, this member cannot check in at reception.`
      : `Unfreeze and reactivate ${memberName}'s membership?`;

    const confirmed = window.confirm(promptMessage);
    if (!confirmed) return;

    setLoading(true);
    const res = await toggleMemberActive(memberId);
    setLoading(false);

    if (res.success) {
      router.refresh();
    } else {
      alert(res.error);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={isActive ? "text-amber-700 hover:bg-amber-50 border-amber-200" : "text-emerald-700 hover:bg-emerald-50 border-emerald-200"}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
      ) : isActive ? (
        <Snowflake className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
      ) : (
        <PlayCircle className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
      )}
      {isActive ? "Freeze member" : "Unfreeze member"}
    </Button>
  );
}
