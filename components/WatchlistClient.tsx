"use client";

import Image from "next/image";
import { Eye } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { WatchButton } from "@/components/WatchButton";
import { categoryLabel, currency, percent } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

export function WatchlistClient() {
  const watchlist = useVaultStore((state) => state.watchlist);

  return (
    <AppShell>
      <section className="mb-8">
        <p className="section-label">Demand Signal</p>
        <h1 className="mt-3 font-serif text-6xl font-light text-vault-text">Your market watchlist.</h1>
        <p className="mt-4 max-w-2xl text-vault-muted">A stock-watchlist view for items you do not own yet. Every watch is a quiet demand signal for the future marketplace.</p>
      </section>

      <div className="vault-table">
        <div className="hidden grid-cols-[1.35fr_0.8fr_0.7fr_0.7fr_0.7fr_0.8fr_0.7fr] border-b border-vault-border px-5 py-3 text-[9px] uppercase tracking-[0.14em] text-vault-faint lg:grid">
          <span>Item</span><span>Category</span><span>Current Price</span><span>Today</span><span>7D</span><span>Watchers</span><span>Status</span>
        </div>
        {watchlist.map((item) => {
          const today = item.currentPrice - item.value24hAgo;
          const seven = item.currentPrice - item.value7dAgo;
          return (
            <div key={item.id} className={`grid gap-4 border-b border-vault-border px-5 py-4 last:border-b-0 lg:grid-cols-[1.35fr_0.8fr_0.7fr_0.7fr_0.7fr_0.8fr_0.7fr] lg:items-center ${item.status === "open_to_offers" ? "bg-vault-gold/5" : "bg-vault-card"}`}>
              <span className="flex items-center gap-3">
                <span className="relative h-11 w-11 overflow-hidden rounded border border-vault-border bg-vault-black">
                  {item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="44px" className="object-cover" /> : <Eye className="m-3 text-vault-gold" />}
                </span>
                <span>
                  <span className="block text-sm font-medium text-vault-text">{item.name}</span>
                  <span className="block text-xs text-vault-faint">Target {item.targetPrice ? currency.format(item.targetPrice) : "not set"}</span>
                </span>
              </span>
              <span className="text-sm text-vault-muted">{categoryLabel(item.category)}</span>
              <span className="data text-sm text-vault-text">{currency.format(item.currentPrice)}</span>
              <span className={`data text-sm ${today >= 0 ? "text-vault-green" : "text-vault-red"}`}>{currency.format(today)} <span className="block text-[10px]">{percent.format(today / item.value24hAgo)}</span></span>
              <span className={`data text-sm ${seven >= 0 ? "text-vault-green" : "text-vault-red"}`}>{currency.format(seven)} <span className="block text-[10px]">{percent.format(seven / item.value7dAgo)}</span></span>
              <span className="data text-sm text-vault-gold">{item.watchers}</span>
              <span className="flex items-center gap-3">
                <span className={`h-2 w-2 rounded-full ${item.status === "open_to_offers" ? "animate-pulse bg-vault-gold" : item.status === "listed" ? "bg-vault-green" : "bg-vault-faint"}`} />
                <span className="text-xs text-vault-muted">{item.status.replaceAll("_", " ")}</span>
                <WatchButton watch={item} />
              </span>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
