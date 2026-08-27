import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-900 text-lg font-bold text-white">
            G
          </div>
          <h1 className="text-xl font-semibold text-zinc-900">Staff Login</h1>
          <p className="mt-1 text-sm text-zinc-500">Sign in to manage members, attendance, and billing.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
