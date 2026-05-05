"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Eye, Sparkles } from "lucide-react";
import { currency } from "@/lib/portfolio-utils";
import type { VaultItem } from "@/lib/types";
import { useVaultStore } from "@/lib/vault-store";

export function OpenToOffersControl({ item, compact = false }: { item: VaultItem; compact?: boolean }) {
  const toggleOpenToOffers = useVaultStore((state) => state.toggleOpenToOffers);
  const updateOfferFloor = useVaultStore((state) => state.updateOfferFloor);
  const allOffers = useVaultStore((state) => state.offers);
  const watchlist = useVaultStore((state) => state.watchlist);
  const [floor, setFloor] = useState(item.offerFloorPrice?.toString() ?? "");
  const enabled = item.listingStatus === "open_to_offers";
  const offers = useMemo(() => allOffers.filter((offer) => offer.itemId === item.id), [allOffers, item.id]);
  const watchers = Math.max(0, watchlist.filter((watch) => watch.category === item.category).length + (item.salesLast30Days ? Math.floor(item.salesLast30Days / 12) : 0));
  const latestOffer = offers[0];

  function toggle() {
    toggleOpenToOffers(item.id, !enabled, floor ? Number(floor) : undefined);
  }

  function saveFloor(value: string) {
    setFloor(value);
    updateOfferFloor(item.id, value ? Number(value) : undefined);
  }

  if (compact) {
    return (
      <button onClick={toggle} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] transition ${enabled ? "border-vault-gold/40 bg-vault-gold/10 text-vault-gold" : "border-vault-border bg-vault-surface text-vault-muted hover:border-vault-bright"}`}>
        <span className={`h-2 w-2 rounded-full ${enabled ? "bg-vault-gold" : "bg-vault-faint"}`} />
        Open to Offers
      </button>
    );
  }

  return (
    <div className="rounded-[10px] border border-vault-border bg-vault-surface p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-label">Passive Liquidity</p>
          <p className="mt-2 text-sm font-medium text-vault-text">Open to Offers</p>
        </div>
        <button onClick={toggle} className={`flex h-7 w-14 items-center rounded-full border p-1 transition ${enabled ? "border-vault-gold bg-vault-gold/20" : "border-vault-border bg-vault-black"}`}>
          <span className={`h-5 w-5 rounded-full transition ${enabled ? "translate-x-7 bg-vault-gold" : "translate-x-0 bg-vault-muted"}`} />
        </button>
      </div>
      <AnimatePresence>
        {enabled ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <label className="mt-4 block">
              <span className="section-label">Minimum you&apos;d accept</span>
              <input value={floor} onChange={(event) => saveFloor(event.target.value)} className="form-input data mt-2" placeholder="$ optional" />
            </label>
            <p className="mt-3 text-xs leading-5 text-vault-muted">We&apos;ll notify you if someone makes an offer. You&apos;re not committed to anything.</p>
            <div className="mt-4 rounded-[8px] border border-vault-gold/25 bg-vault-gold/10 p-4">
              <p className="section-label">Interest Tracker</p>
              <div className="mt-3 grid gap-2 text-sm text-vault-muted">
                <span className="flex items-center gap-2"><Eye size={15} className="text-vault-gold" />{watchers} collectors are watching this category</span>
                <span>Last offer received: <span className="data text-vault-text">{latestOffer ? currency.format(latestOffer.offerPrice) : "No offers yet"}</span></span>
                <span>Est. market value: <span className="data text-vault-gold">{currency.format(item.currentValueUser)}</span></span>
              </div>
              <div className="mt-4 flex gap-2">
                <a href="/offers" className="rounded bg-vault-gold px-3 py-2 text-xs font-semibold text-vault-black">View Offers</a>
                <button onClick={toggle} className="rounded border border-vault-border px-3 py-2 text-xs text-vault-text">Turn Off</button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-center gap-2 text-xs text-vault-muted">
            <Sparkles size={14} className="text-vault-gold" />
            Signal quiet interest without creating a listing.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
