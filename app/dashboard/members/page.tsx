import Link from "next/link";
import { UserPlus } from "lucide-react";
import { listMembers, type MemberStatusFilter } from "@/app/actions/member.actions";
import { MembersFilterBar } from "@/components/dashboard/members-filter-bar";
import { MemberStatusBadge } from "@/components/shared/member-status-badge";
import { Button } from "@/components/ui/button";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const status = (params.status as MemberStatusFilter) ?? "ALL";
  const search = params.q ?? "";

  const members = await listMembers(status, search);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Members</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {members.length} member{members.length === 1 ? "" : "s"} found
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/members/new">
            <UserPlus className="mr-1.5 h-4 w-4" /> Add member
          </Link>
        </Button>
      </div>

      <MembersFilterBar currentStatus={status} currentSearch={search} />

      <div className="mt-6 divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
        {members.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-500">No members match this filter.</div>
        ) : (
          members.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/members/${m.id}`}
              className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-zinc-50"
            >
              <div className="flex min-w-0 items-center gap-3">
                {m.photoUrl ? (
                  <img src={m.photoUrl} alt={m.fullName} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-500">
                    {m.fullName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{m.fullName}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {m.memberCode} · {m.phone} · Joined {fmtDate(m.joiningDate)}
                  </p>
                </div>
              </div>
              <MemberStatusBadge status={m.computedStatus} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
