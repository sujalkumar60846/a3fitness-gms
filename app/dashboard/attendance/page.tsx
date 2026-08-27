import Link from "next/link";
import { QrCode, Clock } from "lucide-react";
import { listTodayAttendance } from "@/app/actions/attendance.actions";
import { ManualAttendanceSearch } from "@/components/dashboard/manual-attendance-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function AttendancePage() {
  const todayAttendance = await listTodayAttendance();
  const todayLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Attendance</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {todayLabel} · {todayAttendance.length} checked in so far
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/attendance/qr-display">
            <QrCode className="mr-1.5 h-4 w-4" /> Show counter QR
          </Link>
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-medium text-zinc-900">Mark attendance manually</p>
          <p className="mb-3 text-xs text-zinc-500">
            Fallback for when a member forgot their phone or the QR scan fails.
          </p>
          <ManualAttendanceSearch />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Clock className="h-4 w-4" /> Today&apos;s Check-ins
        </h2>
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white">
          {todayAttendance.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-zinc-500">No check-ins yet today.</p>
          ) : (
            todayAttendance.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {a.member.photoUrl ? (
                    <img
                      src={a.member.photoUrl}
                      alt={a.member.fullName}
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-medium text-zinc-500">
                      {a.member.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{a.member.fullName}</p>
                    <p className="text-xs text-zinc-500">{a.member.memberCode}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-zinc-500">
                    {new Date(a.checkInTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      a.method === "QR" ? "bg-blue-50 text-blue-600" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {a.method}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
