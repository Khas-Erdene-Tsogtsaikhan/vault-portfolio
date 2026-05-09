"use client";

import Link from "next/link";
import { AuthCard } from "@/components/AuthCard";

export function AuthPageShell({ mode }: { mode: "signin" | "signup" }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-vault-black p-4 text-vault-text">
      <div className="w-full max-w-xl">
        <Link href="/" className="mb-6 block text-center font-serif text-xl font-light uppercase tracking-[0.28em] text-vault-gold">VAULT</Link>
        <AuthCard initialMode={mode} redirectTo="/dashboard" />
      </div>
    </main>
  );
}
