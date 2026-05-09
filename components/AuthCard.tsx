"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogOut, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useVaultStore } from "@/lib/vault-store";

export function AuthCard({ initialMode = "signin", redirectTo }: { initialMode?: "signin" | "signup"; redirectTo?: string } = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Sign in to save your real portfolio.");
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const user = useVaultStore((state) => state.user);
  const authStatus = useVaultStore((state) => state.authStatus);
  const authError = useVaultStore((state) => state.authError);
  const resetToDemo = useVaultStore((state) => state.resetToDemo);

  async function submitEmailPassword() {
    const trimmedEmail = email.trim();

    if (!supabase) {
      setMessage("Production auth is not configured in this environment.");
      return;
    }
    if (!trimmedEmail) {
      setMessage("Enter your email address first.");
      return;
    }
    if (password.length < 6) {
      setMessage("Use a password with at least 6 characters.");
      return;
    }
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (!error && data.session && redirectTo) {
        router.push(redirectTo);
        return;
      }
      setMessage(error ? error.message : "Verification email sent. Confirm it, then your VAULT session will persist.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
    setMessage(error ? error.message : "Signed in. Loading your vault...");
    if (!error && redirectTo) router.push(redirectTo);
  }

  async function signInWithGoogle() {
    if (!supabase) {
      setMessage("Google sign-in is not configured in this environment.");
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
    router.replace("/");
  }

  return (
    <section className="vault-panel overflow-hidden rounded-lg">
      <div className="border-b border-vault-border bg-gradient-to-br from-vault-card to-vault-black p-6">
        <p className="section-label">Account</p>
        <h2 className="mt-3 font-serif text-4xl font-light leading-tight text-vault-text">{authStatus === "authenticated" ? "Your Vault is private" : "Private access to your Vault"}</h2>
        <p className="mt-3 text-sm leading-6 text-vault-muted">{authStatus === "authenticated" ? "Your collection is connected and saved. Manage your session here." : "Create your collector account, verify email, and keep every asset attached to you."}</p>
      </div>
      <div className="p-6">
      {authStatus === "authenticated" ? (
        <div className="rounded-lg border border-vault-gold/25 bg-vault-gold/10 p-4">
          <div className="flex items-center gap-2 text-vault-gold">
            <ShieldCheck size={18} />
            <span className="font-semibold">Signed in</span>
          </div>
          <p className="mt-2 text-sm text-vault-muted">{user.email}</p>
          <button onClick={signOut} className="mt-4 inline-flex items-center gap-2 rounded-md border border-vault-border px-4 py-2 text-sm font-semibold text-vault-text transition hover:border-vault-bright">
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm leading-6 text-vault-muted">{authError ?? message}</p>

          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-2 block section-label">Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" className="form-input w-full" />
            </label>
            <label>
              <span className="mb-2 block section-label">Password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="Minimum 6 characters" className="form-input w-full" />
            </label>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] lg:grid-cols-1 xl:grid-cols-[1fr_auto]">
            <button onClick={submitEmailPassword} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-vault-gold px-5 py-3 text-sm font-semibold text-vault-black transition hover:bg-vault-gold-light">
              {mode === "signup" ? "Create Account" : "Sign In"}
              <ArrowRight size={16} />
            </button>
            <button onClick={signInWithGoogle} className="inline-flex min-h-12 items-center justify-center rounded-md border border-vault-border px-5 py-3 text-sm font-semibold text-vault-text transition hover:-translate-y-0.5 hover:border-vault-bright">Continue with Google</button>
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-vault-border pt-4 text-xs text-vault-faint sm:flex-row sm:items-center sm:justify-between">
            <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-left text-vault-gold transition hover:text-vault-gold-light">
              {mode === "signin" ? "Need an account? Sign up with email verification." : "Already verified? Sign in."}
            </button>
            {!isSupabaseConfigured ? <span>Local demo mode</span> : null}
          </div>
        </>
      )}
      </div>
    </section>
  );
}
