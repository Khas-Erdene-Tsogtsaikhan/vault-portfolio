"use client";

import { useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useVaultStore } from "@/lib/vault-store";

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const loadRemoteVault = useVaultStore((state) => state.loadRemoteVault);
  const resetToDemo = useVaultStore((state) => state.resetToDemo);

  useEffect(() => {
    if (!supabase) {
      resetToDemo();
      return;
    }

    void loadRemoteVault();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        resetToDemo();
        return;
      }
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        void loadRemoteVault();
      }
    });

    return () => data.subscription.unsubscribe();
  }, [loadRemoteVault, resetToDemo]);

  return <>{children}</>;
}
