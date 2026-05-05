import type { ReactNode } from "react";

export function Badge({ children, tone = "gold" }: { children: ReactNode; tone?: "gold" | "green" | "blue" | "purple" | "muted" | "red" }) {
  const tones = {
    gold: "border-vault-gold/35 bg-vault-gold/10 text-vault-gold",
    green: "border-vault-green/35 bg-vault-green/10 text-vault-green",
    blue: "border-vault-blue/35 bg-vault-blue/10 text-vault-blue",
    purple: "border-vault-purple/35 bg-vault-purple/10 text-vault-purple",
    red: "border-vault-red/35 bg-vault-red/10 text-vault-red",
    muted: "border-vault-border bg-vault-surface text-vault-muted"
  };
  return <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
