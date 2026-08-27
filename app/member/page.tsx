import { MemberLookupForm } from "./member-lookup-form";

export default function MemberLookupPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white">
          G
        </div>
        <h1 className="text-xl font-semibold text-zinc-900">My Membership</h1>
        <p className="mt-1 text-sm text-zinc-500">Enter your Member ID to view your plan, attendance, and receipts.</p>
        <div className="mt-6">
          <MemberLookupForm />
        </div>
      </div>
    </div>
  );
}
