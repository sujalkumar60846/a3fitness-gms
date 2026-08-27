import { cn } from "@/lib/utils/cn";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  DUE_SOON: "bg-amber-50 text-amber-700",
  EXPIRED: "bg-red-50 text-red-700",
  INACTIVE: "bg-zinc-100 text-zinc-500",
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  DUE_SOON: "Due Soon",
  EXPIRED: "Expired",
  INACTIVE: "Frozen / Inactive",
};

export function MemberStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? STATUS_STYLES.INACTIVE
      )}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
