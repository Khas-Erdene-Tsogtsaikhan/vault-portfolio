"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { ArrowDown, ArrowUp, ChevronRight, Download, Share2 } from "lucide-react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { AppShell } from "@/components/AppShell";
import { AssetImage } from "@/components/AssetImage";
import { Badge } from "@/components/Badge";
import { marketIndices } from "@/lib/demo-data";
import type { Category, PortfolioSnapshot, VaultItem } from "@/lib/types";
import {
  categoryLabel,
  compactCurrency,
  currency,
  getCategoryBreakdown,
  getCompletenessScore,
  getCurrentValue,
  getItemDailyDelta,
  getItemHighLow,
  getItemImageUrl,
  getItemReturn,
  getPortfolioMetrics,
  percent,
  preciseCurrency
} from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

const ranges = ["1D", "1W", "1M", "3M", "YTD", "ALL"] as const;
type SortKey = "item" | "category" | "cost" | "value" | "today" | "return" | "high" | "weight";

const categoryColors: Record<Category, string> = {
  watches: "#c9a84c",
  wine: "#a891e8",
  spirits: "#e87aa0",
  art: "#7aaee8",
  sneakers: "#50c98a",
  jewelry: "#e2c47a",
  trading_cards: "#a891e8",
  books: "#8a8680",
  coins: "#c9a84c",
  video_games: "#7aaee8",
  comics: "#e87aa0",
  funko: "#50c98a",
  lego: "#e2c47a",
  vintage_clothing: "#e87aa0",
  cars: "#7aaee8",
  guitars: "#50c98a",
  furniture: "#8a8680",
  other: "#8a8680"
};

export function AnalyticsClient() {
  const items = useVaultStore((state) => state.items);
  const portfolioSnapshots = useVaultStore((state) => state.portfolioSnapshots);
  const metrics = getPortfolioMetrics(items);
  const breakdown = getCategoryBreakdown(items);
  const [range, setRange] = useState<(typeof ranges)[number]>("YTD");
  const [sort, setSort] = useState<SortKey>("return");
  const dnaCardRef = useRef<HTMLDivElement | null>(null);

  const rangeHistory = useMemo(() => buildPortfolioTimeline(items, portfolioSnapshots, range), [items, portfolioSnapshots, range]);
  const rangeMove = getRangeMove(rangeHistory);
  const trustSummary = getPortfolioTrustSummary(items);
  const analytics = useMemo(() => buildAnalytics(items, portfolioSnapshots), [items, portfolioSnapshots]);
  const sortedPositions = useMemo(() => sortPositions(items, sort, metrics.totalValue), [items, metrics.totalValue, sort]);
  const watchBreakdown = breakdown.find((row) => row.category === "watches") ?? breakdown[0];
  const categoryIndex = marketIndices.find((index) => index.category === watchBreakdown?.category) ?? marketIndices[0];

  if (items.length === 0) {
    return (
      <AppShell>
        <EmptyAnalyticsState />
      </AppShell>
    );
  }

  async function downloadDnaCard() {
    if (!dnaCardRef.current) return;
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(dnaCardRef.current, {
      backgroundColor: "#07070a",
      scale: 2,
      width: dnaCardRef.current.offsetWidth,
      height: dnaCardRef.current.offsetHeight
    });
    const link = document.createElement("a");
    link.download = "vault-collector-dna.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
        <section className="vault-panel mb-6 overflow-hidden rounded-[12px] border-vault-gold-dim">
          <div className="grid gap-0 xl:grid-cols-[0.88fr_1.12fr]">
            <motion.div className="border-b border-vault-border p-6 sm:p-8 xl:border-b-0 xl:border-r" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <p className="section-label">Portfolio Performance Command Center</p>
              <h1 className="mt-4 font-serif text-[50px] font-light leading-none text-vault-text sm:text-[82px]">
                <AnimatedNumber value={metrics.totalValue} formatter={(value) => currency.format(value)} className="font-serif font-light" />
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-vault-muted">You built a portfolio of physical positions. VAULT turns every object into performance, allocation, and conviction.</p>
              <p className="mt-3 max-w-xl text-xs leading-5 text-vault-muted">{trustSummary}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                <DeltaPill label="Today" amount={metrics.todayDelta} percentage={metrics.todayDeltaPercent} delay={1.9} bright />
                <DeltaPill label="This week" amount={analytics.weekDelta} percentage={analytics.weekDeltaPercent} delay={2.05} />
                <DeltaPill label="This year" amount={analytics.yearDelta} percentage={analytics.yearDeltaPercent} delay={2.2} muted />
              </div>

              <div className="mt-7 space-y-3 rounded-[10px] border border-vault-border bg-vault-black p-4">
                <ComparisonLine label="vs S&P 500 this year" benchmark={0.243} collection={analytics.yearDeltaPercent} />
                <ComparisonLine label={`vs ${categoryIndex.name} YTD`} benchmark={categoryIndex.ytdReturn} collection={analytics.yearDeltaPercent} />
              </div>
            </motion.div>

            <motion.div className="p-4 sm:p-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }}>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="section-label">Total Portfolio Value</p>
                  <p className={`data mt-1 text-sm ${rangeMove.delta >= 0 ? "text-vault-green" : "text-vault-muted"}`}>{rangeMove.delta >= 0 ? "+" : ""}{preciseCurrency.format(rangeMove.delta)} · {rangeMove.deltaPct >= 0 ? "+" : ""}{percent.format(rangeMove.deltaPct)} {range}</p>
                </div>
                <div className="flex rounded border border-vault-border bg-vault-black p-1">
                  {ranges.map((item) => (
                    <button key={item} onClick={() => setRange(item)} className={`rounded px-3 py-2 font-mono text-[11px] transition ${range === item ? "bg-vault-gold text-vault-black" : "text-vault-muted hover:text-vault-text"}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex h-[360px] flex-col rounded-[10px] border border-vault-border bg-vault-black p-3 sm:h-[440px]">
                <div className="min-h-0 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={rangeHistory} margin={{ top: 14, right: 8, bottom: 8, left: 0 }}>
                    <defs>
                      <linearGradient id="portfolioGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c9a84c" stopOpacity={0.42} />
                        <stop offset="85%" stopColor="#c9a84c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#1a1a24" />
                    <XAxis
                      dataKey="date"
                      interval={getXAxisInterval(rangeHistory.length)}
                      minTickGap={34}
                      tickFormatter={(value) => formatAxisLabel(new Date(value), range)}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "#3e3c38", fontSize: 11, fontFamily: "DM Mono" }}
                    />
                    <YAxis orientation="right" tickFormatter={(value) => compactCurrency.format(Number(value))} tickLine={false} axisLine={false} tick={{ fill: "#3e3c38", fontSize: 11, fontFamily: "DM Mono" }} domain={portfolioValueDomain} width={58} />
                    <Tooltip content={<TerminalTooltip startValue={rangeHistory[0]?.value ?? 0} />} cursor={{ stroke: "#8a8680", strokeWidth: 1 }} />
                    <Area type="monotone" dataKey="value" stroke="#c9a84c" strokeWidth={3} fill="url(#portfolioGold)" dot={false} activeDot={{ r: 4, stroke: "#f0ece8", strokeWidth: 1 }} connectNulls isAnimationActive animationDuration={800} animationEasing="ease-out" strokeLinecap="round" strokeLinejoin="round" />
                  </AreaChart>
                </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-vault-faint">Source: portfolio snapshots + item price history · {range} range · hover for exact timestamp</p>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total Return" value={metrics.totalReturn} formatter={currency.format} sub={`${percent.format(metrics.totalReturnPercent)} since first item`} tone="green" delay={0} />
          <MetricCard label="Best Single Day" value={analytics.bestDay.amount} formatter={currency.format} sub={`${analytics.bestDay.date} · ${analytics.bestDay.item}`} tone="green" delay={0.1} />
          <MetricCard label="Most Valuable Item" value={getCurrentValue(metrics.topItem)} formatter={currency.format} sub={metrics.topItem.name} tone="gold" delay={0.2} />
          <MetricCard label="Items Tracked" value={metrics.itemCount} formatter={(value) => Math.round(value).toString()} sub={`Across ${breakdown.length} categories`} tone="text" delay={0.3} />
          <MetricCard label="Avg Hold Period" value={analytics.avgHoldYears} formatter={(value) => `${value.toFixed(1)} yrs`} sub="Avg across all positions" tone="text" delay={0.4} />
        </section>

        <TerminalSection className="mb-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-label">Your Positions</p>
              <h2 className="mt-2 font-serif text-4xl font-light text-vault-text">Brokerage-style holdings for physical assets.</h2>
            </div>
            <Link href="/collection" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-vault-gold hover:text-vault-gold-light">
              View Full Collection <ChevronRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[1040px]">
              <div className="grid grid-cols-[1.6fr_0.9fr_0.85fr_0.85fr_0.85fr_0.8fr_0.8fr_0.9fr] border-b border-vault-border px-4 py-3 text-left text-[9px] uppercase tracking-[0.14em] text-vault-faint">
                <HeaderButton label="Item" sortKey="item" active={sort} onClick={setSort} />
                <HeaderButton label="Category" sortKey="category" active={sort} onClick={setSort} />
                <HeaderButton label="Cost Basis" sortKey="cost" active={sort} onClick={setSort} />
                <HeaderButton label="Mkt Value" sortKey="value" active={sort} onClick={setSort} />
                <HeaderButton label="Today" sortKey="today" active={sort} onClick={setSort} />
                <HeaderButton label="Total Rtn" sortKey="return" active={sort} onClick={setSort} />
                <HeaderButton label="52W High" sortKey="high" active={sort} onClick={setSort} />
                <HeaderButton label="Weight" sortKey="weight" active={sort} onClick={setSort} />
              </div>
              {sortedPositions.map((item, index) => <PositionRow key={item.id} item={item} index={index} totalValue={metrics.totalValue} />)}
            </div>
          </div>
          <p className="mt-4 text-xs text-vault-muted">Showing {items.length} of {items.length} items · Sorted by {sortLabel(sort)}</p>
        </TerminalSection>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <TerminalSection>
            <p className="section-label">Category P&L</p>
            <h2 className="mt-2 font-serif text-4xl font-light text-vault-text">Sector performance by return.</h2>
            <div className="mt-6 space-y-4">
              {[...breakdown].sort((a, b) => b.returnPercentage - a.returnPercentage).map((row, index) => (
                <motion.div key={row.category} initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.4 }} transition={{ delay: index * 0.07 }}>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-vault-text">{categoryLabel(row.category)}</span>
                    <span className="data text-vault-green">{currency.format(row.returnAmount)} · {percent.format(row.returnPercentage)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-vault-black">
                    <motion.div className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${categoryColors[row.category]}, #e2c47a)` }} initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, Math.max(8, row.returnPercentage * 85))}%` }} viewport={{ once: true }} transition={{ duration: 0.9, ease: "easeOut", delay: index * 0.06 }} />
                  </div>
                </motion.div>
              ))}
            </div>
          </TerminalSection>

          <TerminalSection>
            <p className="section-label">Allocation</p>
            <h2 className="mt-2 font-serif text-4xl font-light text-vault-text">Where your capital sits.</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="relative h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<DarkTooltip />} />
                    <Pie data={breakdown} dataKey="value" nameKey="category" innerRadius={78} outerRadius={118} paddingAngle={2} isAnimationActive animationDuration={650}>
                      {breakdown.map((entry) => <Cell key={entry.category} fill={categoryColors[entry.category]} stroke="#07070a" />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="section-label">Total</p>
                  <p className="data mt-1 text-2xl text-vault-gold"><AnimatedNumber value={metrics.totalValue} formatter={compactCurrency.format} /></p>
                </div>
              </div>
              <div className="space-y-3 self-center">
                {breakdown.map((row) => (
                  <div key={row.category} className="flex items-center justify-between gap-3 text-xs">
                    <span className="flex items-center gap-2 text-vault-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColors[row.category] }} />{categoryLabel(row.category)}</span>
                    <span className="data text-vault-text">{compactCurrency.format(row.value)} · {percent.format(row.concentration)}</span>
                  </div>
                ))}
              </div>
            </div>
          </TerminalSection>
        </section>

        <TerminalSection className="mb-6 border-vault-gold-dim bg-gradient-to-br from-[#120e04] to-vault-card">
          <div className="mb-5">
            <p className="section-label">Market Intelligence</p>
            <h2 className="mt-2 font-serif text-5xl font-light text-vault-text">How your collection performs against real financial markets.</h2>
          </div>
          <div className="grid gap-4 xl:grid-cols-3">
            <MarketCard title="vs S&P 500" collection={analytics.yearDeltaPercent} benchmark={0.243} benchmarkLabel="S&P 500" note="Trailing the index, but your assets are physical and illiquid. Holding period matters." />
            <MarketCard title={`vs ${categoryLabel(watchBreakdown.category)} Index`} collection={watchBreakdown.returnPercentage} benchmark={0.112} benchmarkLabel={`${categoryLabel(watchBreakdown.category)} Index`} note={`Your ${categoryLabel(watchBreakdown.category).toLowerCase()} picks outperformed the category index by ${percent.format(watchBreakdown.returnPercentage - 0.112)}.`} featured />
            <MarketCard title="vs Inflation" collection={analytics.yearDeltaPercent} benchmark={0.032} benchmarkLabel="US Inflation" note={`Your collection is preserving wealth. Real return: ${percent.format(analytics.yearDeltaPercent - 0.032)} above inflation.`} badge="Wealth Preserved" />
          </div>
        </TerminalSection>

        <section className="mb-6 grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
          <TerminalSection>
            <p className="section-label">Acquisition History</p>
            <h2 className="mt-2 font-serif text-4xl font-light text-vault-text">Capital deployed over the last 18 months.</h2>
            <div className="mt-6 h-80 rounded-[10px] border border-vault-border bg-vault-black p-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.acquisitionSeries}>
                  <CartesianGrid vertical={false} stroke="#1a1a24" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#3e3c38", fontSize: 10, fontFamily: "DM Mono" }} />
                  <YAxis tickFormatter={(value) => compactCurrency.format(Number(value))} tickLine={false} axisLine={false} tick={{ fill: "#3e3c38", fontSize: 10, fontFamily: "DM Mono" }} width={54} />
                  <Tooltip content={<DarkTooltip />} />
                  <Bar dataKey="spend" fill="#c9a84c" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <SummaryStat label="Total invested" value={metrics.costBasis} />
              <SummaryStat label="Current value" value={metrics.totalValue} tone="gold" />
              <SummaryStat label="Unrealized gain" value={metrics.totalReturn} tone="green" detail={percent.format(metrics.totalReturnPercent)} />
            </div>
          </TerminalSection>

          <TerminalSection>
            <p className="section-label">Top Movers Today</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <MoverColumn title="Gainers" items={analytics.gainers} />
              <MoverColumn title="Losers" items={analytics.losers} />
            </div>
          </TerminalSection>
        </section>

        <TerminalSection className="border-l-2 border-l-vault-gold bg-gradient-to-br from-vault-card via-vault-card to-[#120e04]">
          <div ref={dnaCardRef} className="rounded-[10px] bg-gradient-to-br from-vault-card via-vault-card to-[#120e04] p-1">
          <div className="grid gap-8 xl:grid-cols-[1fr_460px]">
            <div>
              <p className="section-label">Your Collector DNA</p>
              <h2 className="mt-3 font-serif text-4xl font-light text-vault-text">{analytics.dnaTitle}</h2>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-vault-muted">{analytics.dnaCopy}</p>
              <button onClick={downloadDnaCard} className="mt-7 inline-flex items-center gap-2 rounded bg-vault-gold px-5 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-vault-black transition hover:bg-vault-gold-light">
                <Share2 size={15} />
                Share Your Collector DNA
              </button>
              <p className="mt-3 text-xs text-vault-faint">Downloads a PNG capture of this DNA card.</p>
            </div>
            <div className="h-80 rounded-[10px] border border-vault-border bg-vault-black p-4">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analytics.radar}>
                  <PolarGrid stroke="#1e1e2a" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: "#8a8680", fontSize: 11 }} />
                  <Radar dataKey="score" stroke="#c9a84c" fill="#c9a84c" fillOpacity={0.22} isAnimationActive animationDuration={900} />
                  <Tooltip content={<DarkTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
          </div>
        </TerminalSection>
      </motion.div>
    </AppShell>
  );
}

function EmptyAnalyticsState() {
  return (
    <section className="vault-panel overflow-hidden rounded-[12px] border-vault-gold-dim">
      <div className="grid min-h-[560px] place-items-center bg-[radial-gradient(ellipse_at_center_top,rgba(201,168,76,0.10),transparent_58%)] p-6 text-center sm:p-10">
        <div className="mx-auto max-w-2xl">
          <p className="section-label">Analytics</p>
          <h1 className="mt-4 font-serif text-5xl font-light leading-tight text-vault-text sm:text-7xl">
            Your performance terminal starts with the first item.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-vault-muted">
            Add a piece to unlock portfolio value, daily movement, category allocation, top performers, and item-level returns.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/add" className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-vault-gold px-6 py-3 text-sm font-semibold text-vault-black transition hover:-translate-y-0.5 hover:bg-vault-gold-light">
              Add first item <ChevronRight size={16} />
            </Link>
            <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center rounded border border-vault-border px-6 py-3 text-sm font-semibold text-vault-muted transition hover:border-vault-gold/50 hover:text-vault-text">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function DeltaPill({ label, amount, percentage, delay, bright = false, muted = false }: { label: string; amount: number; percentage: number; delay: number; bright?: boolean; muted?: boolean }) {
  const positive = amount >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }} className={`inline-flex items-center gap-2 rounded border px-3 py-2 font-mono text-[12px] ${positive ? "border-vault-green/25 bg-vault-green/10 text-vault-green" : "border-vault-red/25 bg-vault-red/10 text-vault-red"} ${bright ? "brightness-110" : ""} ${muted ? "opacity-80" : ""}`}>
      {positive ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
      {preciseCurrency.format(amount)} {percent.format(percentage)} {label}
    </motion.div>
  );
}

function ComparisonLine({ label, benchmark, collection }: { label: string; benchmark: number; collection: number }) {
  const beating = collection >= benchmark;
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-[1fr_auto_auto_auto] sm:items-center">
      <span className="text-vault-muted">{label}</span>
      <span className="data text-vault-muted">{percent.format(benchmark)}</span>
      <span className="data text-vault-text">Your collection: {percent.format(collection)}</span>
      <span className={`data ${beating ? "text-vault-gold" : "text-vault-muted"}`}>{beating ? "Beating ↑" : "Trailing"}</span>
    </div>
  );
}

function MetricCard({ label, value, formatter, sub, tone, delay }: { label: string; value: number; formatter: (value: number) => string; sub: string; tone: "green" | "gold" | "text"; delay: number }) {
  const color = tone === "green" ? "text-vault-green" : tone === "gold" ? "text-vault-gold" : "text-vault-text";
  return (
    <motion.article className="rounded-[10px] border border-vault-border bg-vault-card p-5 transition hover:-translate-y-0.5 hover:border-vault-bright hover:bg-vault-hover" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay }}>
      <p className="section-label">{label}</p>
      <p className={`data mt-3 text-[28px] ${color}`}><AnimatedNumber value={value} formatter={formatter} duration={1300} /></p>
      <p className="mt-2 text-xs leading-5 text-vault-muted">{sub}</p>
    </motion.article>
  );
}

function TerminalSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  return (
    <motion.section ref={ref} className={`vault-panel rounded-[12px] p-5 sm:p-6 ${className}`} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
      {children}
    </motion.section>
  );
}

function HeaderButton({ label, sortKey, active, onClick }: { label: string; sortKey: SortKey; active: SortKey; onClick: (key: SortKey) => void }) {
  return (
    <button onClick={() => onClick(sortKey)} className={`text-left transition hover:text-vault-muted ${active === sortKey ? "text-vault-gold" : ""}`}>
      {label}
    </button>
  );
}

function PositionRow({ item, index, totalValue }: { item: VaultItem; index: number; totalValue: number }) {
  const daily = getItemDailyDelta(item);
  const itemReturn = getItemReturn(item);
  const high = getItemHighLow(item).high;
  const weight = totalValue ? getCurrentValue(item) / totalValue : 0;
  const isAth = getCurrentValue(item) >= high;
  const acquiredRecently = new Date(item.createdAt) >= new Date("2026-04-05T00:00:00Z");
  const multiplier = getCurrentValue(item) / item.costBasis;

  return (
    <motion.div layout initial={{ opacity: 0, y: -10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.05 }} className={`grid grid-cols-[1.6fr_0.9fr_0.85fr_0.85fr_0.85fr_0.8fr_0.8fr_0.9fr] items-center gap-3 border-b border-vault-border px-4 py-3.5 last:border-b-0 ${isAth ? "bg-vault-gold/5" : "bg-vault-card"} hover:bg-vault-gold/5`}>
      <Link href={`/collection/${item.id}`} className="flex items-center gap-3">
        <div className="relative h-9 w-9 overflow-hidden rounded border border-vault-border">
          <AssetImage src={getItemImageUrl(item)} alt="" sizes="36px" />
        </div>
        <span>
          <span className="block text-[13px] font-medium text-vault-text">{item.name}</span>
          <span className="block text-[10px] text-vault-faint">{item.brand} · Condition: {item.condition}</span>
        </span>
      </Link>
      <span><Badge tone="muted">{categoryLabel(item.category)}</Badge></span>
      <span className="data text-[13px] text-vault-muted">{currency.format(item.costBasis)}</span>
      <span>
        <span className={`data block text-[14px] ${isAth ? "text-vault-gold" : "text-vault-text"}`}>{currency.format(getCurrentValue(item))}</span>
        <span className="block text-[10px] text-vault-faint">{getValueSourceLabel(item)} · {getSyncLabel(item.currentValueUpdatedAt)}</span>
        <span className="mt-1 flex gap-1">{isAth ? <MiniBadge tone="gold">ATH</MiniBadge> : null}{acquiredRecently ? <MiniBadge tone="blue">New</MiniBadge> : null}</span>
      </span>
      <span className={`data text-[13px] ${daily.amount >= 0 ? "text-vault-green" : "text-vault-muted"}`}>{daily.amount >= 0 ? "▲" : "▼"} {preciseCurrency.format(daily.amount)}<span className="block text-[10px]">{percent.format(daily.percentage)}</span></span>
      <span className={`data text-[15px] ${itemReturn.percentage > 0.5 ? "font-semibold text-vault-green" : "text-vault-green"}`}>{percent.format(itemReturn.percentage)}{multiplier >= 2 ? <MiniBadge tone="gold">{Math.floor(multiplier)}x</MiniBadge> : null}</span>
      <span className="data text-[13px] text-vault-muted">{currency.format(high)}</span>
      <span>
        <span className="data text-[12px] text-vault-text">{percent.format(weight)}</span>
        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-vault-black"><span className="block h-full rounded-full bg-vault-gold" style={{ width: `${Math.max(4, weight * 100)}%` }} /></span>
      </span>
    </motion.div>
  );
}

function MiniBadge({ children, tone }: { children: React.ReactNode; tone: "gold" | "blue" }) {
  return <span className={`ml-1 inline-flex rounded px-1.5 py-0.5 font-mono text-[9px] uppercase ${tone === "gold" ? "bg-vault-gold/10 text-vault-gold" : "bg-vault-blue/10 text-vault-blue"}`}>{children}</span>;
}

function MarketCard({ title, collection, benchmark, benchmarkLabel, note, featured = false, badge }: { title: string; collection: number; benchmark: number; benchmarkLabel: string; note: string; featured?: boolean; badge?: string }) {
  const chart = Array.from({ length: 12 }, (_, index) => ({ month: index + 1, collection: 100 * (1 + collection * ((index + 1) / 12)), benchmark: 100 * (1 + benchmark * ((index + 1) / 12)) }));
  return (
    <article className={`rounded-[10px] border p-5 ${featured ? "border-vault-gold-dim bg-vault-gold/10" : "border-vault-border bg-vault-card"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="section-label">{title}</p>
        {featured ? <Badge tone="gold">Beating the market ↑</Badge> : badge ? <Badge tone="green">{badge}</Badge> : null}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div><p className="text-xs text-vault-muted">Your Collection</p><p className="data mt-1 text-2xl text-vault-green">{percent.format(collection)}</p></div>
        <div><p className="text-xs text-vault-muted">{benchmarkLabel}</p><p className="data mt-1 text-2xl text-vault-muted">{percent.format(benchmark)}</p></div>
      </div>
      <div className="mt-5 h-28">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chart}>
            <Line type="monotone" dataKey="benchmark" stroke="#3e3c38" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="collection" stroke={featured ? "#c9a84c" : "#50c98a"} strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-4 text-xs leading-5 text-vault-muted">{note}</p>
    </article>
  );
}

function SummaryStat({ label, value, tone = "text", detail }: { label: string; value: number; tone?: "text" | "gold" | "green"; detail?: string }) {
  const color = tone === "gold" ? "text-vault-gold" : tone === "green" ? "text-vault-green" : "text-vault-text";
  return <div className="rounded-[8px] border border-vault-border bg-vault-surface p-4"><p className="section-label">{label}</p><p className={`data mt-2 text-2xl ${color}`}><AnimatedNumber value={value} formatter={currency.format} /></p>{detail ? <p className="data mt-1 text-xs text-vault-green">{detail}</p> : null}</div>;
}

function MoverColumn({ title, items }: { title: string; items: VaultItem[] }) {
  const positive = title === "Gainers";
  return (
    <div>
      <p className="mb-3 text-[10px] uppercase tracking-[0.14em] text-vault-faint">{title}</p>
      {items.length ? (
        <div className="space-y-3">
          {items.slice(0, 3).map((item) => {
            const daily = getItemDailyDelta(item);
            return (
              <article key={item.id} className="flex items-center gap-3 rounded-[8px] border border-vault-border bg-vault-surface p-3">
                <div className="relative h-11 w-11 overflow-hidden rounded border border-vault-border">
                  <AssetImage src={getItemImageUrl(item)} alt="" sizes="44px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-vault-text">{item.name}</p>
                  <p className="text-[11px] text-vault-faint">{categoryLabel(item.category)}</p>
                </div>
                <div className={`data text-right text-[12px] ${daily.amount >= 0 ? "text-vault-green" : "text-vault-muted"}`}>
                  {daily.amount >= 0 ? "▲" : "▼"} {preciseCurrency.format(daily.amount)}
                  <span className="block">{percent.format(daily.percentage)}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[8px] border border-vault-border bg-vault-surface p-4 text-sm text-vault-muted">{positive ? "No gainers yet." : "No losers today."}</div>
      )}
    </div>
  );
}

function TerminalTooltip({ active, payload, label, startValue }: { active?: boolean; payload?: Array<{ value: number; payload?: { tooltipLabel?: string } }>; label?: string; startValue: number }) {
  if (!active || !payload?.length) return null;
  const value = payload[0].value;
  return (
    <div className="rounded-[8px] border border-vault-bright bg-vault-card p-3">
      <p className="section-label">{payload[0].payload?.tooltipLabel ?? label}</p>
      <p className="data mt-1 text-sm text-vault-text">{currency.format(value)}</p>
      <p className="data mt-1 text-xs text-vault-green">{currency.format(value - startValue)} from period start</p>
    </div>
  );
}

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value: number; payload?: { category?: Category } }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const first = payload[0];
  const name = first.payload?.category ? categoryLabel(first.payload.category) : label ?? first.name ?? "Value";
  return (
    <div className="rounded-[8px] border border-vault-bright bg-vault-card p-3">
      <p className="section-label">{name}</p>
      <p className="data mt-1 text-sm text-vault-text">{typeof first.value === "number" && first.value > 1 ? currency.format(first.value) : first.value}</p>
    </div>
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
  return `${source} · ${latestSync ? getSyncLabel(new Date(latestSync).toISOString()) : "Sync pending"} · Conditions tracked per asset`;
}

function getValueSourceLabel(item: VaultItem) {
  if (item.currentValueSource === "PriceCharting Guide Value") return "PriceCharting Guide Value";
  if (item.currentValueSource === "Your estimate") return "Manual estimate";
  return item.currentValueSource;
}

function getSyncLabel(lastSyncedAt?: string) {
  if (!lastSyncedAt) return "Sync pending";
  const hours = Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 3600000);
  if (hours < 1) return "Last synced just now";
  if (hours < 24) return `Last synced ${hours}h ago`;
  if (hours < 48) return "Last synced yesterday";
  return `Last synced ${Math.floor(hours / 24)}d ago`;
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

function buildAnalytics(items: VaultItem[], snapshots: PortfolioSnapshot[]) {
  const metrics = getPortfolioMetrics(items);
  const history = buildPortfolioTimeline(items, snapshots, "ALL");
  const firstValue = history[0]?.value ?? metrics.costBasis;
  const current = metrics.totalValue;
  const weekDelta = metrics.todayDelta * 6.8;
  const yearDelta = current - firstValue;
  const bestDayItem = [...items].sort((a, b) => getItemDailyDelta(b).amount - getItemDailyDelta(a).amount)[0];
  const avgHoldYears = average(items.map((item) => yearsSince(item.acquiredDate)));
  const performanceSeries = history.map((point, index) => ({ label: point.label, value: point.value, date: point.date, delta: point.value - firstValue, sp500: point.sp500 + index * 900 }));
  const acquisitionSeries = buildAcquisitionSeries(items);
  const gainers = [...items].filter((item) => getItemDailyDelta(item).amount > 0).sort((a, b) => getItemDailyDelta(b).amount - getItemDailyDelta(a).amount);
  const losers = [...items].filter((item) => getItemDailyDelta(item).amount < 0).sort((a, b) => getItemDailyDelta(a).amount - getItemDailyDelta(b).amount);
  const documented = average(items.map(getCompletenessScore));
  const rarity = average(items.map((item) => item.population ? Math.max(0, 100 - item.population / 2) : item.editionTotal ? Math.max(40, 100 - item.editionTotal / 2) : 50));
  const liquidity = average(items.map((item) => Math.min(100, (item.salesLast30Days ?? 4) * 4)));
  const appreciation = Math.min(100, metrics.totalReturnPercent * 55);
  const diversification = Math.min(100, getCategoryBreakdown(items).length * 16);

  return {
    weekDelta,
    weekDeltaPercent: metrics.value24hAgo ? weekDelta / Math.max(metrics.value24hAgo - weekDelta, 1) : 0,
    yearDelta,
    yearDeltaPercent: firstValue ? yearDelta / firstValue : 0,
    bestDay: { amount: bestDayItem ? getItemDailyDelta(bestDayItem).amount : 0, date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }), item: bestDayItem ? `${bestDayItem.name} spike` : "First asset waiting" },
    avgHoldYears,
    performanceSeries,
    acquisitionSeries,
    gainers,
    losers,
    dnaTitle: "Watch-Forward Value Investor",
    dnaCopy: `Your collection is anchored by hard assets with strong secondary markets. ${Math.round((getCategoryBreakdown(items)[0]?.concentration ?? 0) * 100)}% of portfolio value sits in ${categoryLabel(getCategoryBreakdown(items)[0]?.category ?? "watches").toLowerCase()}, while rare pieces and long hold periods suggest patience over speculation. This is not accumulation. It is capital allocation with taste.`,
    radar: [
      { axis: "Rarity", score: Math.round(rarity) },
      { axis: "Liquidity", score: Math.round(liquidity) },
      { axis: "Appreciation", score: Math.round(appreciation) },
      { axis: "Diversification", score: Math.round(diversification) },
      { axis: "Documentation", score: Math.round(documented) }
    ]
  };
}

function sortPositions(items: VaultItem[], sort: SortKey, totalValue: number) {
  return [...items].sort((a, b) => {
    if (sort === "item") return a.name.localeCompare(b.name);
    if (sort === "category") return a.category.localeCompare(b.category);
    if (sort === "cost") return b.costBasis - a.costBasis;
    if (sort === "value") return getCurrentValue(b) - getCurrentValue(a);
    if (sort === "today") return getItemDailyDelta(b).amount - getItemDailyDelta(a).amount;
    if (sort === "high") return getItemHighLow(b).high - getItemHighLow(a).high;
    if (sort === "weight") return (getCurrentValue(b) / totalValue) - (getCurrentValue(a) / totalValue);
    return getItemReturn(b).percentage - getItemReturn(a).percentage;
  });
}

function buildAcquisitionSeries(items: VaultItem[]) {
  const start = new Date("2024-12-01T00:00:00Z");
  return Array.from({ length: 18 }, (_, index) => {
    const date = new Date(start);
    date.setMonth(start.getMonth() + index);
    const key = date.toISOString().slice(0, 7);
    const bought = items.filter((item) => item.createdAt.slice(0, 7) === key || item.acquiredDate.slice(0, 7) === key);
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      spend: bought.reduce((sum, item) => sum + item.costBasis, 0),
      items: bought.map((item) => item.name).join(", ") || "No acquisitions"
    };
  });
}

function sortLabel(sort: SortKey) {
  const labels: Record<SortKey, string> = {
    item: "Item",
    category: "Category",
    cost: "Cost Basis",
    value: "Market Value",
    today: "Today",
    return: "Total Return",
    high: "52W High",
    weight: "Weight"
  };
  return labels[sort];
}

function yearsSince(date: string) {
  return Math.max(0, (Date.now() - new Date(date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
