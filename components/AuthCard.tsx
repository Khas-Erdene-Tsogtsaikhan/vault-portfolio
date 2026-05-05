"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function AuthCard() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("Demo mode active until Supabase env vars are configured.");

  async function signInWithEmail() {
    if (!supabase) {
      setMessage("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable magic links.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email });
    setMessage(error ? error.message : "Magic link sent. Check your email.");
  }

  async function signInWithGoogle() {
    if (!supabase) {
      setMessage("Google OAuth is wired, but Supabase is not configured in this environment.");
      return;
    }
    await supabase.auth.signInWithOAuth({ provider: "google" });
  }

  return (
    <section className="vault-panel rounded-lg p-5">
      <p className="section-label">Supabase Auth</p>
      <h2 className="mt-2 text-2xl font-semibold text-vault-text">Private access to your Vault</h2>
      <p className="mt-3 text-sm leading-6 text-vault-muted">{message}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="form-input" />
        <button onClick={signInWithEmail} className="inline-flex items-center justify-center gap-2 rounded-md bg-vault-gold px-4 py-3 font-semibold text-vault-black">
          <LogIn size={16} />
          Email Link
        </button>
        <button onClick={signInWithGoogle} className="rounded-md border border-vault-border px-4 py-3 font-semibold text-vault-text transition hover:border-vault-bright">Google</button>
      </div>
      <p className="mt-3 text-xs text-vault-faint">{isSupabaseConfigured ? "Supabase configured." : "Supabase not configured. Using local demo state."}</p>
    </section>
  );
}
