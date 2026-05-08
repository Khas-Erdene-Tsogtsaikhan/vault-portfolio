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
  getItemImageUrl,
  getItemReturn,
  getPortfolioMetrics,
  percent,
  preciseCurrency
} from "@/lib/portfolio-utils";
import type { PortfolioSnapshot, VaultItem } from "@/lib/types";
import { useVaultStore } from "@/lib/vault-store";

const ranges = ["1D", "1W", "1M", "3M", "YTD", "ALL"] as const;

const phantomHoldings = [
  { name: "Mew ex PSA 10", meta: "Trading Cards - PriceCharting Guide", value: 4200, weight: 82 },
  { name: "Sealed Booster Box", meta: "Pokemon - Factory Sealed", value: 2850, weight: 56 },
  { name: "Vintage Game CIB", meta: "Video Games - Complete in Box", value: 1790, weight: 35 },
  { name: "Signed Comic #1", meta: "Comics - Graded", value: 980, weight: 19 }
];

export function DashboardClient() {
  const items = useVaultStore((state) => state.items);
  const portfolioSnapshots = useVaultStore((state) => state.portfolioSnapshots);
  const dismissed = useVaultStore((state) => state.dismissedMilestoneValue);
  const lastAddedItemId = useVaultStore((state) => state.lastAddedItemId);
  const dismissMilestone = useVaultStore((state) => state.dismissMilestone);
  const [range, setRange] = useState<(typeof ranges)[number]>("YTD");
  const [heroAnimating, setHeroAnimating] = useState(false);
  const metrics = getPortfolioMetrics(items);
  const rangeHistory = useMemo(() => buildPortfolioTimeline(items, portfolioSnapshots, range), [items, portfolioSnapshots, range]);
  const phantomHistory = useMemo(() => buildPhantomPortfolioTimeline(range), [range]);
  const phantomMove = getRangeMove(phantomHistory);
  const rangeMove = getRangeMove(rangeHistory);
  const trustSummary = getPortfolioTrustSummary(items);
  const bestReturn = getItemReturn(metrics.bestPerformer);
  const bestReturnValue = metrics.bestPerformer.costBasis > 0
    ? percent.format(bestReturn.percentage)
    : bestReturn.amount > 0
      ? `+${currency.format(bestReturn.amount)}`
      : "First signal";
  const rankValue = metrics.percentile > 0 ? `Top ${Math.max(1, Math.round(100 - metrics.percentile))}%` : "Forming";
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
        <section className="vault-hero mb-7 overflow-hidden rounded-[14px] border border-vault-gold-dim p-8 sm:p-11 lg:p-12">
          <div className="relative z-10">
            <div className="flex flex-col justify-between gap-6 sm:flex-row">
              <div>
                <p className="hero-label"><span className="live-dot opacity-40" />Preview Portfolio</p>
                <h1 className="mt-2 max-w-4xl font-serif text-[46px] font-light leading-none text-vault-text/45 sm:text-[72px]">
                  {preciseCurrency.format(12840)}
                </h1>
                <div className="mt-2 inline-flex items-center gap-2 rounded border border-vault-green/10 bg-vault-green/5 px-3 py-1.5 font-mono text-[13px] text-vault-green/55">
                  +{preciseCurrency.format(phantomMove.delta)} ({percent.format(phantomMove.deltaPct)}) {range}
                </div>
                <p className="mt-3 max-w-2xl text-xs leading-5 text-vault-muted">
                  Preview mode. These numbers are sample projections only. Add one real asset and this dashboard becomes your live Vault.
                </p>
              </div>
              <Link href="/add" className="inline-flex h-10 items-center justify-center gap-2 rounded bg-vault-gold px-5 text-xs font-semibold uppercase tracking-[0.08em] text-vault-black transition hover:bg-vault-gold-light">
                <Plus size={15} />
                Add First Asset
              </Link>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_360px]">
              <div className="rounded-[12px] border border-vault-border/70 bg-vault-black/70 p-4 opacity-75">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="section-label">Phantom Performance</p>
                    <p className="mt-1 text-sm text-vault-text/50">A sample of what your portfolio timeline will feel like.</p>
                  </div>
                  <div className="flex rounded border border-vault-border bg-vault-black p-1">
                    {ranges.map((item) => (
                      <button key={item} onClick={() => setRange(item)} className={`rounded px-3 py-2 font-mono text-[11px] transition ${range === item ? "bg-vault-gold/35 text-vault-text" : "text-vault-faint hover:text-vault-muted"}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={phantomHistory} margin={{ top: 14, right: 10, bottom: 8, left: 0 }}>
                      <defs>
                        <linearGradient id="phantomValueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#50c98a" stopOpacity={0.12} />
                          <stop offset="85%" stopColor="#50c98a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        interval={getXAxisInterval(phantomHistory.length)}
                        minTickGap={34}
                        tickFormatter={(value) => formatAxisLabel(new Date(value), range)}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "rgba(240,236,232,0.22)", fontSize: 11, fontFamily: "DM Mono" }}
                      />
                      <YAxis orientation="right" tickLine={false} axisLine={false} width={72} domain={portfolioValueDomain} tick={{ fill: "rgba(240,236,232,0.22)", fontSize: 11, fontFamily: "DM Mono" }} tickFormatter={(value) => compactCurrency.format(Number(value))} />
                      <Tooltip
                        cursor={{ stroke: "rgba(201,168,76,0.18)" }}
                        contentStyle={{ background: "#111118", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, color: "#f0ece8" }}
                        formatter={(value: number) => [currency.format(value), "Sample Vault"]}
                        labelFormatter={(value) => formatTooltipLabel(new Date(value))}
                      />
                      <Area type="monotone" dataKey="value" stroke="rgba(80,201,138,0.58)" fill="url(#phantomValueGradient)" strokeWidth={3} dot={false} activeDot={{ r: 4, stroke: "#f0ece8", strokeWidth: 1 }} strokeDasharray="7 7" isAnimationActive animationDuration={900} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-vault-faint">Preview data only - real tracking starts with your first item</p>
              </div>

              <div className="grid gap-3">
                {phantomHoldings.map((item) => (
                  <div key={item.name} className="rounded-[10px] border border-vault-border/70 bg-vault-card/55 p-4 opacity-70">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-vault-text/60">{item.name}</p>
                        <p className="mt-1 text-[11px] text-vault-faint">{item.meta}</p>
                      </div>
                      <p className="data text-sm text-vault-gold/60">{currency.format(item.value)}</p>
                    </div>
                    <div className="mt-3 h-1.5 rounded-full bg-vault-black">
                      <div className="h-full rounded-full bg-vault-green/35" style={{ width: `${item.weight}%` }} />
                    </div>
                  </div>
                ))}
                <div className="rounded-[10px] border border-dashed border-vault-gold/25 bg-vault-gold/5 p-4">
                  <p className="section-label">How It Activates</p>
                  <p className="mt-2 text-sm leading-6 text-vault-muted">Search PriceCharting, choose a guide value, add what you paid, and the phantom chart is replaced by your real portfolio.</p>
                </div>
              </div>
            </div>
          </div>
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
              <p className="mt-3 max-w-2xl text-xs leading-5 text-vault-muted">{trustSummary}</p>
            </div>
            <Link href="/add" className="inline-flex h-10 items-center justify-center gap-2 rounded bg-vault-gold px-5 text-xs font-semibold uppercase tracking-[0.08em] text-vault-black transition hover:bg-vault-gold-light">
              <Plus size={15} />
              Add Item
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-10">
            <HeroStat value={metrics.itemCount.toString()} label="Items owned" />
            <HeroStat value={currency.format(metrics.totalValue / Math.max(metrics.itemCount, 1))} label="Avg. item value" />
            <HeroStat value={bestReturnValue} label="Best return ever" tone="green" />
            <HeroStat value={rankValue} label="Among collectors" tone="gold" />
          </div>
        </div>
      </section>

      <section className="mb-7 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <PrideCard icon={Crown} label="Crown Jewel" title={metrics.topItem.name} value={compactCurrency.format(getCurrentValue(metrics.topItem))} detail={`${percent.format(getItemReturn(metrics.topItem).percentage)} since you paid ${compactCurrency.format(metrics.topItem.costBasis)}`} featured />
        <PrideCard icon={Flame} label="Hottest Category" title={metrics.hottestCategory ? metrics.hottestCategory.category.replace("_", " ") : "None"} value={metrics.hottestCategory ? percent.format(metrics.hottestCategory.returnPercentage) : "0%"} detail="Best performing category right now" />
        <PrideCard icon={Gem} label="Rarest Piece" title={metrics.rarestPiece.name} value={metrics.rarestPiece.editionTotal ? `#${metrics.rarestPiece.editionNumber}/${metrics.rarestPiece.editionTotal}` : "Unique"} detail="Scarcity signal in your vault" />
        <PrideCard icon={Trophy} label="Acquisition Streak" title={`${metrics.acquisitionStreak} month${metrics.acquisitionStreak === 1 ? "" : "s"}`} value={metrics.acquisitionStreak ? "Active" : "Ready"} detail={metrics.acquisitionStreak ? "Consecutive months adding pieces" : "Add another asset this month to start a streak"} />
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
              <IndexCard label={`${range} Move`} value={`${rangeMove.delta >= 0 ? "+" : ""}${preciseCurrency.format(rangeMove.delta)}`} detail={`${rangeMove.deltaPct >= 0 ? "+" : ""}${percent.format(rangeMove.deltaPct)} across selected range`} tone={rangeMove.delta >= 0 ? "green" : "muted"} />
              <IndexCard label={index.name} value={percent.format(index.ytdReturn)} detail={`${percent.format(index.todayReturn)} today`} tone={index.ytdReturn >= 0 ? "green" : "muted"} />
              <IndexCard label="Benchmark" value={beatingMarket ? "Beating market ↑" : "Building history"} detail={`${percent.format(metrics.totalReturnPercent - index.ytdReturn)} spread`} tone={beatingMarket ? "gold" : "muted"} />
            </div>
            <div className="flex h-[360px] flex-col rounded-[10px] border border-vault-border bg-vault-black p-3 sm:h-[430px]">
              <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rangeHistory} margin={{ top: 18, right: 10, bottom: 8, left: 0 }}>
                  <defs>
                    <linearGradient id="vaultValueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={metrics.todayDelta >= 0 ? "#50c98a" : "#c9a84c"} stopOpacity={0.22} />
                      <stop offset="85%" stopColor={metrics.todayDelta >= 0 ? "#50c98a" : "#c9a84c"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    interval={getXAxisInterval(rangeHistory.length)}
                    minTickGap={34}
                    tickFormatter={(value) => formatAxisLabel(new Date(value), range)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "#3e3c38", fontSize: 11, fontFamily: "DM Mono" }}
                  />
                  <YAxis orientation="right" tickLine={false} axisLine={false} width={72} domain={portfolioValueDomain} tick={{ fill: "#3e3c38", fontSize: 11, fontFamily: "DM Mono" }} tickFormatter={(value) => compactCurrency.format(Number(value))} />
                  <Tooltip
                    cursor={{ stroke: "#2a2a3a" }}
                    contentStyle={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, color: "#f0ece8" }}
                    formatter={(value: number, name: string) => [currency.format(value), name === "value" ? "Vault" : "S&P 500"]}
                    labelFormatter={(value) => formatTooltipLabel(new Date(value))}
                  />
                  <Area type="monotone" dataKey="value" stroke={metrics.todayDelta >= 0 ? "#50c98a" : "#c9a84c"} fill="url(#vaultValueGradient)" strokeWidth={3} dot={false} activeDot={{ r: 4, stroke: "#f0ece8", strokeWidth: 1 }} connectNulls isAnimationActive animationDuration={800} animationEasing="ease-out" strokeLinecap="round" strokeLinejoin="round" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-vault-faint">Source: portfolio snapshots + item price history · {range} range · hover for exact timestamp</p>
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
                    <AssetImage src={getItemImageUrl(item)} alt={item.name} sizes="44px" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="block truncate text-[13px] font-medium text-vault-text">{item.name}</span>
                      {isAth ? <span className="rounded border border-vault-gold/30 bg-vault-gold/10 px-1.5 py-0.5 font-mono text-[9px] text-vault-gold">ATH</span> : null}
                    </span>
                    <span className="block truncate text-[11px] text-vault-faint">Condition: {item.condition} · {item.category.replace("_", " ")} · {getUpdateLabel(item.currentValueUpdatedAt)}</span>
                  </span>
                </span>
                <span className="text-right">
                  <span className="data block text-[13px] text-vault-text">{currency.format(getCurrentValue(item))}</span>
                  <span className="block text-[10px] text-vault-faint">{getValueSourceLabel(item)}</span>
                </span>
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

const portfolioValueDomain = ([dataMin, dataMax]: [number, number]): [number, number] => {
  const min = Number.isFinite(dataMin) ? Math.max(0, dataMin) : 0;
  const max = Number.isFinite(dataMax) ? Math.max(dataMax, min + 1) : min + 1;
  const padding = Math.max((max - min) * 0.12, max * 0.04, 100);
  return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
};

function buildPortfolioTimeline(items: VaultItem[], snapshots: PortfolioSnapshot[], range: (typeof ranges)[number]) {
  const now = new Date();
  const start = getRangeStart(range, now, items, snapshots);
  const timeSet = new Set<number>([start.getTime(), now.getTime()]);

  for (const snapshot of snapshots) {
    const date = new Date(snapshot.createdAt || `${snapshot.snapshotDate}T12:00:00`);
    if (date >= start && date <= now) timeSet.add(date.getTime());
  }

  for (const item of items) {
    [item.createdAt, item.updatedAt, item.currentValueUpdatedAt, ...item.priceHistory.map((point) => point.recordedAt)]
      .map((value) => new Date(value))
      .filter((date) => Number.isFinite(date.getTime()) && date >= start && date <= now)
      .forEach((date) => timeSet.add(date.getTime()));
  }

  const times = Array.from(timeSet).sort((a, b) => a - b);
  const sampledTimes = thinTimeline(times, range);
  return sampledTimes.map((time, index) => {
    const date = new Date(time);
    const value = items.reduce((sum, item) => sum + getTrackedItemValueAt(item, date), 0);
    return {
      date: date.toISOString(),
      label: formatAxisLabel(date, range),
      tooltipLabel: formatTooltipLabel(date),
      value,
      sp500: value * (1 + index * 0.002)
    };
  });
}

function buildPhantomPortfolioTimeline(range: (typeof ranges)[number]) {
  const now = new Date();
  const start = getPhantomRangeStart(range, now);
  const pointCount = range === "1D" ? 24 : range === "1W" ? 28 : range === "1M" ? 30 : range === "3M" ? 42 : range === "YTD" ? 48 : 56;
  const span = Math.max(1, now.getTime() - start.getTime());
  const base = 7800;
  const end = 12840;

  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const curve = 1 - Math.pow(1 - progress, 1.75);
    const wave = Math.sin(progress * Math.PI * 4) * 180 + Math.cos(progress * Math.PI * 7) * 90;
    const value = Math.max(0, base + (end - base) * curve + wave);
    const date = new Date(start.getTime() + span * progress);
    return {
      date: date.toISOString(),
      value: Math.round(value),
      sp500: Math.round(value * (0.94 + progress * 0.04))
    };
  });
}

function getPhantomRangeStart(range: (typeof ranges)[number], now: Date) {
  const start = new Date(now);
  if (range === "1D") start.setDate(now.getDate() - 1);
  else if (range === "1W") start.setDate(now.getDate() - 7);
  else if (range === "1M") start.setMonth(now.getMonth() - 1);
  else if (range === "3M") start.setMonth(now.getMonth() - 3);
  else if (range === "YTD") return new Date(now.getFullYear(), 0, 1);
  else start.setFullYear(now.getFullYear() - 1);
  return start;
}

function getRangeMove(history: Array<{ value: number }>) {
  const first = history[0]?.value ?? 0;
  const last = history.at(-1)?.value ?? first;
  const delta = last - first;
  return { delta, deltaPct: first > 0 ? delta / first : 0 };
}

function getXAxisInterval(pointCount: number) {
  if (pointCount <= 4) return 0;
  if (pointCount <= 8) return 1;
  return Math.ceil(pointCount / 5);
}

function getPortfolioTrustSummary(items: VaultItem[]) {
  const marketCount = items.filter((item) => item.currentValueSource === "PriceCharting Guide Value").length;
  const manualCount = items.length - marketCount;
  const latestSync = items
    .map((item) => new Date(item.currentValueUpdatedAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const source = marketCount && manualCount
    ? `PriceCharting Guide Value on ${marketCount} item${marketCount === 1 ? "" : "s"} · ${manualCount} manual estimate${manualCount === 1 ? "" : "s"}`
    : marketCount
      ? "PriceCharting Guide Value"
      : "Manual owner estimates";
  return `${source} · ${latestSync ? getUpdateLabel(new Date(latestSync).toISOString()) : "Sync pending"} · Conditions tracked per asset`;
}

function getValueSourceLabel(item: VaultItem) {
  if (item.currentValueSource === "PriceCharting Guide Value") return "PriceCharting Guide Value";
  if (item.currentValueSource === "Your estimate") return "Manual estimate";
  return item.currentValueSource;
}

function getRangeStart(range: (typeof ranges)[number], now: Date, items: VaultItem[], snapshots: PortfolioSnapshot[]) {
  const start = new Date(now);
  if (range === "1D") start.setDate(now.getDate() - 1);
  if (range === "1W") start.setDate(now.getDate() - 7);
  if (range === "1M") start.setMonth(now.getMonth() - 1);
  if (range === "3M") start.setMonth(now.getMonth() - 3);
  if (range === "YTD") return new Date(now.getFullYear(), 0, 1);
  if (range !== "ALL") return start;

  const candidates = [
    ...items.map((item) => new Date(item.createdAt).getTime()),
    ...snapshots.map((snapshot) => new Date(snapshot.createdAt || `${snapshot.snapshotDate}T12:00:00`).getTime())
  ].filter(Number.isFinite);
  return candidates.length ? new Date(Math.min(...candidates)) : new Date(now.getTime() - 86400000);
}

function thinTimeline(times: number[], range: (typeof ranges)[number]) {
  const maxPoints = range === "1D" ? 36 : range === "1W" ? 42 : 60;
  if (times.length <= maxPoints) return times;
  const step = Math.ceil(times.length / maxPoints);
  const sampled = times.filter((_, index) => index % step === 0);
  if (sampled.at(-1) !== times.at(-1)) sampled.push(times.at(-1)!);
  return sampled;
}

function getTrackedItemValueAt(item: VaultItem, date: Date) {
  const trackedAt = new Date(item.createdAt).getTime();
  const at = date.getTime();
  if (at < trackedAt) return 0;

  const history = [
    ...item.priceHistory.map((point) => ({ value: point.value, time: new Date(point.recordedAt).getTime() })),
    { value: getCurrentValue(item), time: new Date(item.currentValueUpdatedAt).getTime() }
  ]
    .filter((point) => Number.isFinite(point.time))
    .sort((a, b) => a.time - b.time);

  const point = [...history].reverse().find((candidate) => candidate.time <= at);
  return point?.value ?? getCurrentValue(item);
}

function formatAxisLabel(date: Date, range: (typeof ranges)[number]) {
  if (range === "1D") return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (range === "1W") return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
  if (range === "1M" || range === "3M" || range === "YTD") return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function formatTooltipLabel(date: Date) {
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function getUpdateLabel(lastSyncedAt?: string) {
  if (!lastSyncedAt) return "Sync pending";
  const hours = Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 3600000);
  if (hours < 1) return "Last synced just now";
  if (hours < 24) return `Last synced ${hours}h ago`;
  if (hours < 48) return "Last synced yesterday";
  return `Last synced ${Math.floor(hours / 24)}d ago`;
}
