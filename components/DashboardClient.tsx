"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Flame, Gem, Plus, Trophy } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { AppShell } from "@/components/AppShell";
import { AssetImage } from "@/components/AssetImage";
import { CategoryBars } from "@/components/CategoryBars";
import { marketActivity, marketIndices } from "@/lib/demo-data";
import {
  compactCurrency,
  currency,
  getCategoryBreakdown,
  getCrossedMilestone,
  getCurrentValue,
  getItemDailyDelta,
  getItemHighLow,
  getItemReturn,
  getPortfolioHistory,
  getPortfolioMetrics,
  getPrimaryPhoto,
  percent,
  preciseCurrency
} from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

const ranges = ["1D", "1W", "1M", "3M", "YTD", "ALL"] as const;

export function DashboardClient() {
  const items = useVaultStore((state) => state.items);
  const portfolioSnapshots = useVaultStore((state) => state.portfolioSnapshots);
  const dismissed = useVaultStore((state) => state.dismissedMilestoneValue);
  const lastAddedItemId = useVaultStore((state) => state.lastAddedItemId);
  const dismissMilestone = useVaultStore((state) => state.dismissMilestone);
  const [range, setRange] = useState<(typeof ranges)[number]>("YTD");
  const [heroAnimating, setHeroAnimating] = useState(false);
  const metrics = getPortfolioMetrics(items);
  const snapshotHistory = getSnapshotHistory(portfolioSnapshots);
  const history = snapshotHistory.length >= 2 ? snapshotHistory : getPortfolioHistory(items);
  const rangeHistory = useMemo(() => filterHistoryForRange(history, range), [history, range]);
  const breakdown = getCategoryBreakdown(items);
  const milestone = getCrossedMilestone(metrics.totalValue);
  const showMilestone = milestone && milestone.value !== dismissed;
  const index = marketIndices.find((candidate) => candidate.category === metrics.hottestCategory?.category) ?? marketIndices[0];
  const beatingMarket = metrics.totalReturnPercent > index.ytdReturn;
  const holdings = useMemo(() => [...items].sort((a, b) => getCurrentValue(b) - getCurrentValue(a)), [items]);
  const lastAddedItem = items.find((item) => item.id === lastAddedItemId);
  const heroDeltaPositive = metrics.todayDelta >= 0;

  if (!items.length) {
    return (
      <AppShell>
        <section className="vault-hero rounded-[14px] border border-vault-gold-dim p-8 sm:p-12">
          <p className="hero-label">Your First Vault Position</p>
          <h1 className="mt-3 max-w-4xl font-serif text-6xl font-light leading-none text-vault-text sm:text-7xl">Every serious portfolio starts with one documented asset.</h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-vault-muted">Search sold comps, add your cost basis, and attach owner proof. Once the first asset lands here, VAULT starts tracking your physical wealth like a financial terminal.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[10px] border border-vault-border bg-vault-card p-4">
              <p className="section-label">Step 1</p>
              <p className="mt-2 text-sm text-vault-text">Search market value</p>
            </div>
            <div className="rounded-[10px] border border-vault-border bg-vault-card p-4">
              <p className="section-label">Step 2</p>
              <p className="mt-2 text-sm text-vault-text">Add what you paid</p>
            </div>
            <div className="rounded-[10px] border border-vault-border bg-vault-card p-4">
              <p className="section-label">Step 3</p>
              <p className="mt-2 text-sm text-vault-text">Attach proof</p>
            </div>
          </div>
          <Link href="/add" className="mt-8 inline-flex items-center gap-2 rounded bg-vault-gold px-5 py-3 text-sm font-semibold text-vault-black transition hover:bg-vault-gold-light">
            <Plus size={16} />
            Add First Asset
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <AnimatePresence>
        {showMilestone ? (
          <motion.div
            className="mb-6 flex items-center gap-4 rounded-[10px] border border-vault-gold-dim bg-gradient-to-br from-[#120e04] to-vault-surface p-5"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ type: "spring", stiffness: 180, damping: 20 }}
          >
            <Trophy size={28} className="text-vault-gold" />
            <div>
              <span className="block text-sm font-medium text-vault-gold">You&apos;ve crossed {milestone.label}</span>
              <span className="text-xs text-vault-muted">Your collection has entered the top {milestone.percentile}% of Vault portfolios tracked this year.</span>
            </div>
            <button onClick={() => dismissMilestone(milestone.value)} className="ml-auto text-lg text-vault-faint transition hover:text-vault-muted">x</button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className={`vault-hero mb-7 rounded-[14px] border border-vault-gold-dim p-8 transition-colors sm:p-11 lg:p-12 ${heroAnimating ? (heroDeltaPositive ? "vault-hero-animating-up" : "vault-hero-animating-down") : ""}`}>
        <div className="relative z-10">
          <div className="flex flex-col justify-between gap-6 sm:flex-row">
            <div>
              <p className="hero-label"><span className={`live-dot ${heroAnimating ? "live-dot-solid" : ""}`} />Portfolio Value</p>
              <h1 className="relative mt-2 max-w-4xl font-serif text-[46px] font-light leading-none sm:text-[72px]">
                <AnimatePresence>
                  {lastAddedItem ? (
                    <motion.span
                      className="gain-pill"
                      initial={{ opacity: 0, y: 0, scale: 0.98 }}
                      animate={{ opacity: [0, 1, 1, 0], y: -42, scale: [0.98, 1, 1, 0.92] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.9, ease: "easeOut" }}
                    >
                      +{currency.format(getCurrentValue(lastAddedItem))}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                <AnimatedNumber
                  value={metrics.totalValue}
                  duration={2000}
                  formatter={(value) => preciseCurrency.format(value)}
                  className={heroAnimating ? (heroDeltaPositive ? "text-vault-green" : "text-vault-gold") : "text-vault-text transition-colors duration-500"}
                  onStart={() => setHeroAnimating(true)}
                  onEnd={() => setHeroAnimating(false)}
                />
              </h1>
              <div className={`mt-2 inline-flex items-center gap-2 rounded border px-3 py-1.5 font-mono text-[13px] ${metrics.todayDelta >= 0 ? "border-vault-green/20 bg-vault-green/10 text-vault-green" : "border-vault-border bg-vault-surface text-vault-muted"}`}>
                {metrics.todayDelta >= 0 ? "▲" : "▼"} {metrics.todayDelta >= 0 ? "+" : ""}{preciseCurrency.format(metrics.todayDelta)} ({metrics.todayDeltaPercent >= 0 ? "+" : ""}{percent.format(metrics.todayDeltaPercent)}) Today
              </div>
            </div>
            <Link href="/add" className="inline-flex h-10 items-center justify-center gap-2 rounded bg-vault-gold px-5 text-xs font-semibold uppercase tracking-[0.08em] text-vault-black transition hover:bg-vault-gold-light">
              <Plus size={15} />
              Add Item
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-10">
            <HeroStat value={metrics.itemCount.toString()} label="Items owned" />
            <HeroStat value={currency.format(metrics.totalValue / Math.max(metrics.itemCount, 1))} label="Avg. item value" />
            <HeroStat value={percent.format(getItemReturn(metrics.bestPerformer).percentage)} label="Best return ever" tone="green" />
            <HeroStat value={`Top ${metrics.percentile}%`} label="Among collectors" tone="gold" />
          </div>
        </div>
      </section>

      <section className="mb-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PrideCard icon={Crown} label="Crown Jewel" title={metrics.topItem.name} value={compactCurrency.format(getCurrentValue(metrics.topItem))} detail={`${percent.format(getItemReturn(metrics.topItem).percentage)} since you paid ${compactCurrency.format(metrics.topItem.costBasis)}`} featured />
        <PrideCard icon={Flame} label="Hottest Category" title={metrics.hottestCategory ? metrics.hottestCategory.category.replace("_", " ") : "None"} value={metrics.hottestCategory ? percent.format(metrics.hottestCategory.returnPercentage) : "0%"} detail="Best performing category right now" />
        <PrideCard icon={Gem} label="Rarest Piece" title={metrics.rarestPiece.name} value={metrics.rarestPiece.editionTotal ? `#${metrics.rarestPiece.editionNumber}/${metrics.rarestPiece.editionTotal}` : "Unique"} detail="Scarcity signal in your vault" />
        <PrideCard icon={Trophy} label="Acquisition Streak" title={`${metrics.acquisitionStreak} months`} value="Active" detail="Consecutive months adding pieces" />
      </section>

      <section className="mb-7 vault-panel overflow-hidden rounded-[12px]">
        <div className="border-b border-vault-border p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="section-label">Live Portfolio Performance</p>
              <h2 className="mt-2 font-serif text-4xl font-light text-vault-text sm:text-5xl">Your collection is moving like a market.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-vault-muted">This is the daily-open hook: total value, today&apos;s delta, category benchmarks, and the proof behind what moved.</p>
            </div>
            <div className="flex rounded border border-vault-border bg-vault-black p-1">
              {ranges.map((item) => (
                <button key={item} onClick={() => setRange(item)} className={`rounded px-3 py-2 font-mono text-[11px] transition ${range === item ? "bg-vault-gold text-vault-black" : "text-vault-muted hover:text-vault-text"}`}>
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-0 xl:grid-cols-[minmax(0,1.45fr)_440px]">
          <div className="border-b border-vault-border p-4 sm:p-6 xl:border-b-0 xl:border-r">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <IndexCard label="Your Portfolio" value={percent.format(metrics.totalReturnPercent)} detail={`${preciseCurrency.format(metrics.totalReturn)} total gain`} tone={metrics.totalReturn >= 0 ? "green" : "muted"} />
              <IndexCard label={index.name} value={percent.format(index.ytdReturn)} detail={`${percent.format(index.todayReturn)} today`} tone={index.ytdReturn >= 0 ? "green" : "muted"} />
              <IndexCard label="Benchmark" value={beatingMarket ? "Beating market ↑" : "Building history"} detail={`${percent.format(metrics.totalReturnPercent - index.ytdReturn)} spread`} tone={beatingMarket ? "gold" : "muted"} />
            </div>
            <div className="h-[360px] rounded-[10px] border border-vault-border bg-vault-black p-3 sm:h-[430px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rangeHistory} margin={{ top: 18, right: 10, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="vaultValueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metrics.todayDelta >= 0 ? "#50c98a" : "#c9a84c"} stopOpacity={0.22} />
                      <stop offset="85%" stopColor={metrics.todayDelta >= 0 ? "#50c98a" : "#c9a84c"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#3e3c38", fontSize: 11, fontFamily: "DM Mono" }} />
                  <YAxis orientation="right" tickLine={false} axisLine={false} width={72} domain={portfolioValueDomain} tick={{ fill: "#3e3c38", fontSize: 11, fontFamily: "DM Mono" }} tickFormatter={(value) => compactCurrency.format(Number(value))} />
                  <Tooltip
                    cursor={{ stroke: "#2a2a3a" }}
                    contentStyle={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, color: "#f0ece8" }}
                    formatter={(value: number, name: string) => [currency.format(value), name === "value" ? "Vault" : "S&P 500"]}
                  />
                  <Area type="monotone" dataKey="value" stroke={metrics.todayDelta >= 0 ? "#50c98a" : "#c9a84c"} fill="url(#vaultValueGradient)" strokeWidth={3} dot={false} isAnimationActive animationDuration={800} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <aside className="grid gap-0">
            <div className="border-b border-vault-border p-5">
              <CategoryBars data={breakdown} />
            </div>
            <div className="p-5">
              <p className="section-label">Market Data Feed</p>
              <div className="mt-4 space-y-3">
                {marketActivity.map((activity) => (
                  <article key={activity.id} className="rounded-[8px] border border-vault-border bg-vault-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium leading-6 text-vault-text">{activity.itemName}</p>
                      <span className={`data shrink-0 text-[12px] ${activity.deltaPercentage >= 0 ? "text-vault-green" : "text-vault-muted"}`}>{percent.format(activity.deltaPercentage)}</span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-vault-muted">{activity.message}</p>
                  </article>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="vault-table">
        <div className="flex items-center justify-between border-b border-vault-border px-5 py-4">
          <div>
            <p className="section-label">Holdings</p>
            <p className="mt-1 text-xs text-vault-muted">Daily deltas make every owned object behave like a position.</p>
          </div>
          <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-vault-faint sm:block">Value / Today</span>
        </div>
        {holdings.map((item, index) => {
          const daily = getItemDailyDelta(item);
          const highLow = getItemHighLow(item);
          const isAth = getCurrentValue(item) >= highLow.high;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.4 }}
            >
              <Link href={`/collection/${item.id}`} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-vault-border px-5 py-4 transition last:border-b-0 hover:bg-vault-gold/5 sm:grid-cols-[minmax(0,1fr)_auto_auto] ${isAth ? "bg-vault-gold/5" : ""}`}>
                <span className="flex min-w-0 items-center gap-3">
                  <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-vault-border bg-vault-black">
                    <AssetImage src={getPrimaryPhoto(item.photos)?.url} alt={item.name} sizes="44px" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="block truncate text-[13px] font-medium text-vault-text">{item.name}</span>
                      {isAth ? <span className="rounded border border-vault-gold/30 bg-vault-gold/10 px-1.5 py-0.5 font-mono text-[9px] text-vault-gold">ATH</span> : null}
                    </span>
                    <span className="block truncate text-[11px] text-vault-faint">{item.condition} · {item.category.replace("_", " ")} · {getUpdateLabel(item.currentValueUpdatedAt)}</span>
                  </span>
                </span>
                <span className="data text-[13px] text-vault-text">{currency.format(getCurrentValue(item))}</span>
                <span className={`data text-right text-[13px] ${daily.amount >= 0 ? "text-vault-green" : "text-vault-muted"}`}>
                  {daily.amount >= 0 ? "▲ +" : "▼ "}{preciseCurrency.format(daily.amount)} today
                  <span className="block text-[11px]">{daily.percentage >= 0 ? "+" : ""}{percent.format(daily.percentage)}</span>
                </span>
              </Link>
            </motion.div>
          );
        })}
      </section>
    </AppShell>
  );
}

function HeroStat({ value, label, tone = "text" }: { value: string; label: string; tone?: "text" | "green" | "gold" }) {
  const color = tone === "green" ? "text-vault-green" : tone === "gold" ? "text-vault-gold" : "text-vault-text";
  return (
    <div>
      <div className={`data mb-0.5 text-[19px] ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-[0.08em] text-vault-faint">{label}</div>
    </div>
  );
}

function IndexCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "green" | "muted" | "gold" }) {
  const color = tone === "green" ? "text-vault-green" : tone === "muted" ? "text-vault-muted" : "text-vault-gold";
  return (
    <div className="rounded-[8px] border border-vault-border bg-vault-surface p-4">
      <p className="section-label">{label}</p>
      <p className={`data mt-2 text-xl ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-vault-muted">{detail}</p>
    </div>
  );
}

function PrideCard({ icon: Icon, label, title, value, detail, featured = false }: { icon: LucideIcon; label: string; title: string; value: string; detail: string; featured?: boolean }) {
  return (
    <motion.article
      className={`relative overflow-hidden rounded-[10px] border p-5 transition hover:-translate-y-0.5 ${
        featured ? "border-vault-gold-dim bg-gradient-to-br from-[#120e04] to-vault-card" : "border-vault-border bg-vault-card hover:border-vault-bright hover:bg-vault-hover"
      }`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
      <div className="flex items-center justify-between">
        <Icon size={22} className="text-vault-gold" />
        {featured ? <span className="rounded bg-vault-gold/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.06em] text-vault-gold">All time high</span> : null}
      </div>
      <p className="section-label mt-3">{label}</p>
      <h3 className="mt-1 min-h-14 font-serif text-[26px] font-normal leading-tight text-vault-text">{title}</h3>
      <p className="data mt-2 text-sm text-vault-gold">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-vault-muted">{detail}</p>
    </motion.article>
  );
}

function filterHistoryForRange<T extends { date?: string }>(history: T[], range: (typeof ranges)[number]) {
  if (range === "ALL" || history.length <= 2) return history;
  const days = range === "1D" ? 1 : range === "1W" ? 7 : range === "1M" ? 31 : range === "3M" ? 92 : 366;
  const lastDate = new Date(history.at(-1)?.date ?? Date.now());
  const cutoff = new Date(lastDate);
  cutoff.setDate(lastDate.getDate() - days);
  const filtered = history.filter((point) => new Date(point.date ?? 0) >= cutoff);
  return filtered.length >= 2 ? filtered : history.slice(-Math.min(history.length, range === "1D" ? 2 : 8));
}

const portfolioValueDomain = ([dataMin, dataMax]: [number, number]): [number, number] => {
  const min = Number.isFinite(dataMin) ? Math.max(0, dataMin) : 0;
  const max = Number.isFinite(dataMax) ? Math.max(dataMax, min + 1) : min + 1;
  const padding = Math.max((max - min) * 0.12, max * 0.04, 100);
  return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
};

function getSnapshotHistory(snapshots: Array<{ snapshotDate: string; totalValue: number }>) {
  return snapshots
    .filter((snapshot) => snapshot.totalValue > 0)
    .map((snapshot) => ({
      date: `${snapshot.snapshotDate}T12:00:00.000Z`,
      month: new Date(`${snapshot.snapshotDate}T12:00:00.000Z`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: snapshot.totalValue
    }));
}

function getUpdateLabel(lastSyncedAt?: string) {
  if (!lastSyncedAt) return "Sync pending";
  const hours = Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 3600000);
  if (hours < 1) return "Updated just now";
  if (hours < 6) return `Updated ${hours}h ago`;
  if (hours < 24) return "Updated today";
  if (hours < 48) return "Updated yesterday";
  return `Synced ${Math.floor(hours / 24)}d ago`;
}
