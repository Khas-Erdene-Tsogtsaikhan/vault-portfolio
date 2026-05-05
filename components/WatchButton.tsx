"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { MarketSearchResult, WatchlistItem } from "@/lib/types";
import { useVaultStore } from "@/lib/vault-store";

export function WatchButton({ result, watch }: { result?: MarketSearchResult; watch?: WatchlistItem }) {
  const watchlist = useVaultStore((state) => state.watchlist);
  const watchMarketItem = useVaultStore((state) => state.watchMarketItem);
  const unwatchItem = useVaultStore((state) => state.unwatchItem);
  const [target, setTarget] = useState("");
  const [open, setOpen] = useState(false);
  const existing = watch ?? (result ? watchlist.find((item) => item.itemIdentifier === result.id) : undefined);
  const watching = Boolean(existing);

  function handleClick() {
    if (existing) {
      unwatchItem(existing.id);
      return;
    }
    setOpen(true);
  }

  function save(justWatch = false) {
    if (!result) return;
    watchMarketItem(result, justWatch || !target ? undefined : Number(target));
    setOpen(false);
  }

  return (
    <div className="relative">
      <button onClick={handleClick} className={`inline-flex items-center gap-2 rounded border px-3 py-2 text-xs font-medium transition ${watching ? "border-vault-gold/40 bg-vault-gold/10 text-vault-gold" : "border-vault-border bg-vault-surface text-vault-muted hover:border-vault-bright hover:text-vault-text"}`}>
        <Eye size={14} className={watching ? "fill-vault-gold" : ""} />
        {watching ? "Watching" : "Watch"}
      </button>
      {open && result ? (
        <div className="absolute right-0 top-11 z-20 w-80 rounded-[10px] border border-vault-bright bg-vault-card p-4">
          <p className="section-label">Watching</p>
          <p className="mt-2 text-sm font-medium text-vault-text">{result.title}</p>
          <div className="mt-4 space-y-3 text-xs text-vault-muted">
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Any offer is accepted</label>
            <label className="block">
              <span className="mb-1 block">Price drops below</span>
              <input value={target} onChange={(event) => setTarget(event.target.value)} className="form-input data" placeholder="$ target price" />
            </label>
            <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Someone opens this to offers</label>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => save(false)} className="rounded bg-vault-gold px-3 py-2 text-xs font-semibold text-vault-black">Set Watch</button>
            <button onClick={() => save(true)} className="rounded border border-vault-border px-3 py-2 text-xs text-vault-text">Just watch</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
