"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AssetImage } from "@/components/AssetImage";
import { currency, getItemImageUrl } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

export function OffersClient() {
  const offers = useVaultStore((state) => state.offers);
  const items = useVaultStore((state) => state.items);
  const updateOfferStatus = useVaultStore((state) => state.updateOfferStatus);
  const [counter, setCounter] = useState<Record<string, string>>({});

  return (
    <AppShell>
      <section className="mb-8">
        <p className="section-label">Offers Inbox</p>
        <h1 className="mt-3 font-serif text-6xl font-light text-vault-text">Interest without marketplace pressure.</h1>
        <p className="mt-4 max-w-2xl text-vault-muted">Accepting an offer only flags mutual interest in Phase 2. No escrow, no checkout, no forced transaction.</p>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {offers.map((offer) => {
          const item = items.find((candidate) => candidate.id === offer.itemId);
          if (!item) return null;
          return (
            <article key={offer.id} className="vault-panel rounded-lg p-5">
              <div className="grid gap-4 sm:grid-cols-[88px_1fr]">
                <div className="relative h-22 min-h-24 overflow-hidden rounded-md border border-vault-border bg-vault-black">
                  <AssetImage src={getItemImageUrl(item)} alt="" sizes="88px" />
                </div>
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-vault-text">{item.name}</p>
                      <p className="mt-1 text-sm text-vault-muted">from @{offer.buyerUsername} · {new Date(offer.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="rounded border border-vault-gold/30 bg-vault-gold/10 px-2 py-1 font-mono text-[10px] uppercase text-vault-gold">{offer.status}</span>
                  </div>
                  <p className="data mt-5 text-4xl text-vault-gold">{currency.format(offer.offerPrice)}</p>
                  <p className="mt-3 flex items-center gap-2 text-sm leading-6 text-vault-muted"><MessageSquare size={15} />{offer.message ?? "No message attached."}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => updateOfferStatus(offer.id, "accepted")} className="rounded bg-vault-gold px-4 py-2 text-xs font-semibold text-vault-black">Accept — start sale</button>
                    <button onClick={() => updateOfferStatus(offer.id, "declined")} className="rounded border border-vault-border px-4 py-2 text-xs text-vault-text">Decline</button>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <input value={counter[offer.id] ?? ""} onChange={(event) => setCounter({ ...counter, [offer.id]: event.target.value })} className="form-input data" placeholder="Counter amount" />
                    <button onClick={() => updateOfferStatus(offer.id, "countered", Number(counter[offer.id] || offer.offerPrice))} className="rounded border border-vault-border px-4 text-vault-text"><Send size={15} /></button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}
