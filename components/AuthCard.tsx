"use client";

import { useState } from "react";
import { LogIn, LogOut, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useVaultStore } from "@/lib/vault-store";

export function AuthCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in to persist your real portfolio to Supabase.");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const user = useVaultStore((state) => state.user);
  const authStatus = useVaultStore((state) => state.authStatus);
  const authError = useVaultStore((state) => state.authError);
  const resetToDemo = useVaultStore((state) => state.resetToDemo);

  async function submitEmailPassword() {
    if (!supabase) {
      setMessage("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable production auth.");
      return;
    }
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      setMessage(error ? error.message : "Verification email sent. Confirm it, then your VAULT session will persist.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "Signed in. Loading your Supabase vault...");
  }

  async function signInWithGoogle() {
    if (!supabase) {
      setMessage("Google OAuth is wired, but Supabase is not configured in this environment.");
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut();
    resetToDemo();
    setMessage("Signed out. Demo mode is active again.");
  }

  return (
    <section className="vault-panel rounded-lg p-5">
      <p className="section-label">Production Supabase Auth</p>
      <h2 className="mt-2 text-2xl font-semibold text-vault-text">Private access to your Vault</h2>
      {authStatus === "authenticated" ? (
        <div className="mt-4 rounded-lg border border-vault-gold/25 bg-vault-gold/10 p-4">
          <div className="flex items-center gap-2 text-vault-gold">
            <ShieldCheck size={18} />
            <span className="font-semibold">Session persisted</span>
          </div>
          <p className="mt-2 text-sm text-vault-muted">{user.email} is connected to Supabase. Adds and uploads now write to Postgres and Storage.</p>
          <button onClick={signOut} className="mt-4 inline-flex items-center gap-2 rounded-md border border-vault-border px-4 py-2 text-sm font-semibold text-vault-text transition hover:border-vault-bright">
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      ) : null}
      <p className="mt-3 text-sm leading-6 text-vault-muted">{authError ?? message}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="form-input" />
        <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Password" className="form-input" />
        <button onClick={submitEmailPassword} className="inline-flex items-center justify-center gap-2 rounded-md bg-vault-gold px-4 py-3 font-semibold text-vault-black">
          <LogIn size={16} />
          {mode === "signup" ? "Create Account" : "Sign In"}
        </button>
        <button onClick={signInWithGoogle} className="rounded-md border border-vault-border px-4 py-3 font-semibold text-vault-text transition hover:border-vault-bright">Google</button>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-vault-faint">
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-vault-gold transition hover:text-vault-gold-light">
          {mode === "signin" ? "Need an account? Sign up with email verification." : "Already verified? Sign in."}
        </button>
        <span>{isSupabaseConfigured ? `Supabase ${authStatus}.` : "Supabase not configured. Using local demo state."}</span>
      </div>
    </section>
  );
}
