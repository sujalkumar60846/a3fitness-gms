import { redirect } from "next/navigation";
import { getAuthenticatedMemberSession } from "@/app/actions/member-public.actions";
import { MemberLookupForm } from "./member-lookup-form";
import { Shield, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MemberLookupPage() {
  const session = await getAuthenticatedMemberSession();
  if (session && session.memberCode) {
    redirect(`/member/${session.memberCode}`);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 shadow-xl">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-2xl font-bold text-white shadow-md">
            G
          </div>
          <h1 className="text-2xl font-bold text-zinc-900">Member Portal Login</h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            Enter your registered mobile number and 4-digit Unique ID to access your dashboard.
          </p>
        </div>

        <MemberLookupForm />
      </div>

      <p className="mt-6 text-center text-xs text-zinc-400">
        A3Fitness Luxury Gym & Spa · Member Self-Service Portal
      </p>
    </div>
  );
}
