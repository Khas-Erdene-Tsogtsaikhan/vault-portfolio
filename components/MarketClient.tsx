"use client";

import { Activity, Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { MarketLookup } from "@/components/MarketLookup";
import { marketActivity, marketIndices } from "@/lib/demo-data";
import { categoryLabel, currency, getItemDailyDelta, getPortfolioMetrics, percent } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

export function MarketClient() {
  const items = useVaultStore((state) => state.items);
  const metrics = getPortfolioMetrics(items);
  const movers = [...items]
    .map((item) => ({ item, daily: getItemDailyDelta(item) }))
    .sort((a, b) => Math.abs(b.daily.amount) - Math.abs(a.daily.amount));

  return (
    <AppShell>
      <section className="mb-8">
        <p className="section-label">Market Intelligence</p>
        <h1 className="mt-3 max-w-4xl font-serif text-4xl font-light leading-none text-vault-text sm:text-6xl">Your vault now listens to the market.</h1>
        <p className="mt-4 max-w-2xl text-vault-muted">Search sold comps and see price events for what you own. No marketplace noise. Just portfolio intelligence.</p>
      </section>

      <section className="mb-6">
        <MarketLookup />
      </section>

      <section className="mb-6 grid gap-4 lg:grid-cols-3">
        {marketIndices.map((index) => {
          const beating = metrics.totalReturnPercent > index.ytdReturn;
          return (
            <article key={index.id} className="vault-panel rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="section-label">{categoryLabel(index.category)}</p>
                  <h2 className="mt-3 text-xl font-semibold text-vault-text">{index.name}</h2>
                </div>
                <Badge tone={index.todayReturn >= 0 ? "green" : "red"}>{percent.format(index.todayReturn)} today</Badge>
              </div>
              <p className={`data mt-6 text-4xl ${index.ytdReturn >= 0 ? "text-vault-green" : "text-vault-red"}`}>{percent.format(index.ytdReturn)}</p>
              <p className="mt-2 text-sm text-vault-muted">YTD index return</p>
              <div className="mt-5 rounded-md border border-vault-border bg-vault-surface p-3">
                <p className="text-xs text-vault-muted">Your portfolio: <span className="data text-vault-text">{percent.format(metrics.totalReturnPercent)}</span></p>
                <p className={`data mt-1 text-xs ${beating ? "text-vault-gold" : "text-vault-muted"}`}>{beating ? "You are beating this market" : "Market ahead, holding period matters"}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_430px]">
        <div className="vault-table">
          <div className="flex items-center justify-between border-b border-vault-border px-5 py-4">
            <div>
              <p className="section-label">Market Feed</p>
              <p className="mt-1 text-xs text-vault-muted">Price events for owned positions.</p>
            </div>
            <Activity size={16} className="text-vault-gold" />
          </div>
          {movers.map(({ item, daily }) => (
            <div key={item.id} className="grid gap-3 border-b border-vault-border px-5 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-vault-text">{item.name}</span>
                <span className="block text-[11px] text-vault-faint">{item.condition} - {categoryLabel(item.category)}</span>
              </span>
              <span className="data text-sm text-vault-text sm:text-right">{currency.format(item.currentValueUser)}</span>
              <span className={`data text-sm sm:text-right ${daily.amount >= 0 ? "text-vault-green" : "text-vault-red"}`}>
                {daily.amount >= 0 ? "+" : ""}{currency.format(daily.amount)}
                <span className="block text-[11px]">{percent.format(daily.percentage)}</span>
              </span>
            </div>
          ))}
          {!movers.length ? (
            <div className="px-5 py-10 text-sm leading-6 text-vault-muted">Your owned positions will appear here after you add the first item to your portfolio.</div>
          ) : null}
        </div>

        <aside>
          <section className="vault-panel rounded-lg p-5">
            <p className="section-label">Discovery Feed</p>
            <div className="mt-5 space-y-3">
              {marketActivity.map((activity) => (
                <article key={activity.id} className="rounded-md border border-vault-border bg-vault-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm font-medium leading-6 text-vault-text">{activity.itemName}</h2>
                    <span className={`data shrink-0 text-[12px] ${activity.deltaPercentage >= 0 ? "text-vault-green" : "text-vault-red"}`}>{percent.format(activity.deltaPercentage)}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-vault-muted">{activity.message}</p>
                  <p className="mt-3 flex items-center gap-2 text-[11px] text-vault-faint"><Bell size={13} /> Notification event logged for future alerts.</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </AppShell>
  );
}
