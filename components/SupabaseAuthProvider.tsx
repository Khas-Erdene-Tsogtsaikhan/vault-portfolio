"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useVaultStore } from "@/lib/vault-store";

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const loadRemoteVault = useVaultStore((state) => state.loadRemoteVault);
  const resetToDemo = useVaultStore((state) => state.resetToDemo);

  useEffect(() => {
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/privacy" || pathname === "/terms" || pathname.startsWith("/auth/callback");

    if (!supabase) {
      resetToDemo();
      return;
    }
    const client = supabase;

    async function initializeSession() {
      const { data } = await client.auth.getSession();
      if (!data.session) {
        resetToDemo();
        if (!isPublicPage) router.replace("/");
        return;
      }

      await loadRemoteVault();
    }

    void initializeSession();
    const { data } = client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        resetToDemo();
        if (!isPublicPage) router.replace("/");
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        void loadRemoteVault();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [loadRemoteVault, pathname, resetToDemo, router]);

  return <>{children}</>;
}
