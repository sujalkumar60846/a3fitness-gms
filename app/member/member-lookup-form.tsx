"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function MemberLookupForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    router.push(`/member/${code.trim().toUpperCase()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="e.g. GYM-0001"
        className="text-center text-lg tracking-wide"
        autoFocus
        autoCapitalize="characters"
      />
      <Button type="submit" size="lg" disabled={loading || !code.trim()}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        View My Dashboard
      </Button>
    </form>
  );
}
