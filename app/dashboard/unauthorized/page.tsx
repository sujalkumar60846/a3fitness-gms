import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <ShieldAlert className="h-7 w-7 text-red-500" />
      </div>
      <h1 className="text-xl font-semibold text-zinc-900">You don&apos;t have access to this page</h1>
      <p className="mt-1.5 max-w-sm text-sm text-zinc-500">
        This section is restricted to certain roles. If you think this is a mistake, ask your Super Admin to check your account permissions.
      </p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
