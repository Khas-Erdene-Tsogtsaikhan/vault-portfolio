"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackShell message="Securing your VAULT session..." />}>
      <AuthCallbackContent />
    </Suspense>
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Securing your VAULT session...");

  useEffect(() => {
    async function exchangeCode() {
      if (!supabase) {
        setMessage("Supabase is not configured.");
        return;
      }
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setMessage(error.message);
          return;
        }
      }
      router.replace("/");
    }
    void exchangeCode();
  }, [router, searchParams]);

  return <CallbackShell message={message} />;
}

function CallbackShell({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-vault-black p-6 text-vault-text">
      <section className="vault-panel max-w-md rounded-lg p-6 text-center">
        <p className="section-label">Auth Callback</p>
        <h1 className="mt-3 font-serif text-4xl font-light text-vault-gold">Opening your vault</h1>
        <p className="mt-4 text-sm text-vault-muted">{message}</p>
      </section>
    </main>
  );
}
