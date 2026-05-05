import { tierConfig } from "@/lib/portfolio-utils";
import type { TierName } from "@/lib/types";

export function TierBadge({ tier }: { tier: TierName }) {
  const config = tierConfig[tier];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border border-vault-gold-dim bg-gradient-to-br from-vault-gold/10 to-transparent px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] ${config.color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-vault-gold shadow-[0_0_6px_var(--gold)]" />
      {tier} Tier
    </span>
  );
}
