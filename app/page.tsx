"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Camera,
  Clock3,
  Database,
  FileCheck2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const categories = ["Trading Cards", "Pokemon", "Sports Cards", "Video Games", "Comics", "Coins", "Consoles", "Watches", "More"];

const previewItems = [
  {
    name: "Mew ex #53",
    set: "Paldean Fates",
    condition: "PSA 10",
    value: "$7,000",
    move: "+$420",
    tint: "from-[#514070] to-[#15111f]"
  },
  {
    name: "Charizard X ex",
    set: "Pokemon 151",
    condition: "Raw / Ungraded",
    value: "$4,850",
    move: "+$210",
    tint: "from-[#5e2b20] to-[#15100f]"
  },
  {
    name: "PlayStation 2 Slim",
    set: "Console",
    condition: "CIB",
    value: "$162",
    move: "+$8",
    tint: "from-[#273955] to-[#0f1219]"
  }
];

const chartPoints = "0,152 34,146 68,149 102,132 136,138 170,112 204,118 238,88 272,74 306,56 340,62 374,38 408,43 442,22 476,14 510,18";

const allocation = [
  { label: "Trading Cards", value: "$214.8k", pct: "76%", width: "76%" },
  { label: "Video Games", value: "$42.3k", pct: "15%", width: "15%" },
  { label: "Comics", value: "$27.0k", pct: "9%", width: "9%" }
];

export default function HomePage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function redirectIfSignedIn() {
      if (!supabase) {
        setCheckingSession(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        router.replace("/dashboard");
        return;
      }

      setCheckingSession(false);
    }

    void redirectIfSignedIn();
  }, [router]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-vault-black text-vault-text">
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-vault-black/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-serif text-xl font-light uppercase tracking-[0.28em] text-vault-gold">
            VAULT
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded border border-vault-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-vault-muted transition hover:border-vault-bright hover:text-vault-text">
              Sign in
            </Link>
            <Link href="/signup" className="rounded bg-vault-gold px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-vault-black transition hover:bg-vault-gold-light">
              Start free
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden px-4 pb-20 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.16),rgba(7,7,10,0)_66%)]" />
        <div className="absolute inset-x-0 top-[360px] h-px bg-gradient-to-r from-transparent via-vault-gold/20 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-vault-gold">Collectibles Portfolio Tracker</p>
            <h1 className="mt-5 font-serif text-5xl font-light leading-[0.92] text-vault-text sm:text-7xl lg:text-8xl">
              Your collection. Your portfolio.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-vault-muted sm:text-lg">
              Track trading cards, games, comics, and collectibles with real guide values, daily movement, provenance records, and a dashboard that feels like a brokerage account for your vault.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-vault-gold px-6 py-3 text-sm font-semibold text-vault-black shadow-[0_0_40px_rgba(201,168,76,0.18)] transition hover:-translate-y-0.5 hover:bg-vault-gold-light">
                Create your vault
                <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="inline-flex min-h-12 items-center justify-center rounded border border-vault-border px-6 py-3 text-sm font-semibold text-vault-muted transition hover:border-vault-gold/50 hover:text-vault-text">
                Sign in
              </Link>
            </div>
            <p className="mt-5 text-xs leading-5 text-vault-muted">Built for collectors treating inventory, provenance, and market value seriously.</p>
          </div>

          <div className="mt-10">
            <p className="mb-3 text-center text-[10px] uppercase tracking-[0.22em] text-vault-faint">Actual product experience, shown with demo data</p>
            <ProductPreview />
          </div>

          <TrustStrip />
          {checkingSession ? <p className="mt-5 text-center text-[10px] uppercase tracking-[0.12em] text-vault-faint">Checking session...</p> : null}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#08080c] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <ValueCard icon={Database} title="Real guide values" body="Powered by PriceCharting sold-data references for eligible catalog items, with manual value control when you need it." />
          <ValueCard icon={Clock3} title="Daily movement" body="Snapshots turn your collection into a time series, so the dashboard, deltas, and charts move as your vault changes." />
          <ValueCard icon={FileCheck2} title="Proof beside every piece" body="Receipts, certificates, photos, notes, condition, and cost basis live with each asset instead of scattered across folders." />
        </div>
      </section>

      <ProductWorkflow />

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="section-label">Built for every category</p>
            <h2 className="mt-4 font-serif text-4xl font-light leading-tight text-vault-text sm:text-6xl">
              One vault for the whole collection.
            </h2>
            <p className="mt-5 text-sm leading-7 text-vault-muted">
              Cards, consoles, comics, sealed product, sports cards, and manual one-off pieces can sit in the same portfolio view without making the dashboard feel messy.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {categories.map((category) => (
                <span key={category} className="rounded-full border border-vault-border bg-vault-card px-4 py-2 text-xs text-vault-muted">
                  {category}
                </span>
              ))}
            </div>
          </div>
          <CategoryPanel />
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#08080c] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl border-l border-vault-gold/60 pl-6 text-center sm:pl-10">
          <blockquote className="font-serif text-4xl font-light leading-tight text-vault-text sm:text-6xl">
            &ldquo;I spent years collecting. I had no idea what I actually had. Now I do.&rdquo;
          </blockquote>
          <p className="mt-6 text-sm text-vault-muted">Early VAULT collector</p>
        </div>
      </section>

      <section className="px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="section-label">Free beta access</p>
          <h2 className="mt-4 font-serif text-5xl font-light leading-none text-vault-text sm:text-7xl">
            Start knowing what your collection is worth.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-vault-muted">
            No credit card required. Add your first items, attach proof, and watch the dashboard become your collection&apos;s live command center.
          </p>
          <Link href="/signup" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded bg-vault-gold px-7 py-3 text-sm font-semibold text-vault-black transition hover:-translate-y-0.5 hover:bg-vault-gold-light">
            Create your vault
            <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-xs leading-5 text-vault-faint">Free up to 10 items during beta. Pro tracking comes later.</p>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-vault-muted md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-serif text-sm uppercase tracking-[0.24em] text-vault-gold">VAULT</p>
            <p className="mt-2 text-xs">Track your collection like a portfolio</p>
          </div>
          <div className="flex gap-4 text-xs">
            <Link href="/privacy" className="hover:text-vault-text">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-vault-text">Terms</Link>
            <a href="mailto:hello@vaultcollection.org" className="hover:text-vault-text">Contact</a>
          </div>
          <p className="text-xs">&copy; 2025 VAULT</p>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="mx-auto max-w-6xl rounded-[24px] border border-vault-gold/20 bg-[#050507] p-2 shadow-[0_40px_140px_rgba(0,0,0,0.58)]">
      <div className="overflow-hidden rounded-[18px] border border-white/[0.07] bg-vault-black">
        <div className="flex items-center justify-between gap-4 border-b border-vault-border bg-white/[0.025] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#e06060]/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-vault-gold/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-vault-green/80" />
          </div>
          <div className="hidden rounded-full border border-vault-border bg-vault-black px-4 py-1.5 text-[10px] uppercase tracking-[0.16em] text-vault-faint sm:block">
            vaultcollection.org/dashboard
          </div>
          <div className="data text-[10px] text-vault-green">Synced 4h ago</div>
        </div>

        <div className="grid lg:grid-cols-[218px_1fr]">
          <aside className="hidden border-r border-vault-border bg-[#09090d] p-5 lg:block">
            <p className="font-serif text-base uppercase tracking-[0.24em] text-vault-gold">VAULT</p>
            <nav className="mt-8 space-y-2 text-xs">
              {["Dashboard", "Collection", "Analytics", "Documents"].map((item, index) => (
                <div key={item} className={`rounded border px-3 py-2 ${index === 0 ? "border-vault-gold/35 bg-vault-gold/10 text-vault-text" : "border-transparent text-vault-muted"}`}>
                  {item}
                </div>
              ))}
            </nav>
            <div className="mt-10 rounded border border-vault-border bg-vault-card p-4">
              <p className="section-label">Portfolio health</p>
              <p className="data mt-3 text-2xl text-vault-green">+18.4%</p>
              <p className="mt-1 text-xs text-vault-muted">All-time return</p>
            </div>
          </aside>

          <div className="p-4 sm:p-6">
            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
              <section className="rounded-[14px] border border-vault-border bg-[#0d0d12] p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-vault-green shadow-[0_0_16px_rgba(46,158,91,0.75)]" />
                      <p className="section-label">Portfolio Value</p>
                    </div>
                    <p className="mt-2 font-serif text-5xl font-light text-vault-text sm:text-7xl">$284,150</p>
                    <p className="data mt-3 inline-flex rounded border border-vault-green/20 bg-vault-green/10 px-3 py-1 text-xs text-vault-green">
                      +$8,420 &middot; +3.05% today
                    </p>
                  </div>
                  <div className="rounded border border-vault-gold/25 bg-vault-gold/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-vault-gold">
                    PriceCharting Guide Value
                  </div>
                </div>

                <div className="mt-6 rounded-[12px] border border-vault-border bg-vault-black p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs text-vault-muted">Range movement</p>
                    <div className="flex gap-1 text-[10px] text-vault-faint">
                      {["1D", "1W", "1M", "3M", "YTD", "ALL"].map((range, index) => (
                        <span key={range} className={`rounded px-2 py-1 ${index === 4 ? "bg-vault-gold/15 text-vault-gold" : ""}`}>
                          {range}
                        </span>
                      ))}
                    </div>
                  </div>
                  <svg viewBox="0 0 510 180" className="h-52 w-full overflow-visible">
                    <defs>
                      <linearGradient id="landingChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#2e9e5b" stopOpacity="0.32" />
                        <stop offset="88%" stopColor="#2e9e5b" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d={`M ${chartPoints} L 510,180 L 0,180 Z`} fill="url(#landingChartFill)" />
                    <polyline points={chartPoints} fill="none" stroke="#50c98a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
                    <circle cx="476" cy="14" r="5" fill="#50c98a" />
                  </svg>
                </div>
              </section>

              <section className="space-y-3">
                <div className="rounded-[14px] border border-vault-border bg-[#0d0d12] p-4">
                  <div className="flex items-center justify-between">
                    <p className="section-label">Top holdings</p>
                    <p className="data text-[10px] text-vault-green">Live</p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {previewItems.map((item) => (
                      <PreviewHolding key={item.name} item={item} />
                    ))}
                  </div>
                </div>

                <div className="rounded-[14px] border border-vault-gold/25 bg-vault-gold/10 p-4">
                  <div className="flex items-center gap-2 text-vault-gold">
                    <ShieldCheck size={16} />
                    <p className="text-sm font-medium">Receipts and photos attached</p>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-vault-muted">Every item can carry proof, notes, condition, cost basis, and source labels.</p>
                </div>
              </section>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="Items tracked" value="143" detail="Across 6 categories" />
              <MiniMetric label="Best return" value="+251%" detail="Mew ex #53" positive />
              <MiniMetric label="Documents" value="98" detail="Receipts and COAs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewHolding({ item }: { item: (typeof previewItems)[number] }) {
  return (
    <div className="rounded-[10px] border border-vault-border bg-vault-black p-3">
      <div className="flex items-center gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br ${item.tint} shadow-[inset_0_1px_20px_rgba(255,255,255,0.04)]`}>
          <span className="h-7 w-5 rounded-sm border border-vault-gold/25 bg-vault-text/80 shadow-[0_10px_30px_rgba(0,0,0,0.45)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-vault-text">{item.name}</p>
          <p className="mt-1 truncate text-[11px] text-vault-faint">{item.set} &middot; {item.condition}</p>
        </div>
        <div className="text-right">
          <p className="data text-sm text-vault-gold">{item.value}</p>
          <p className="data text-xs text-vault-green">{item.move}</p>
        </div>
      </div>
    </div>
  );
}

function TrustStrip() {
  return (
    <div className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-3">
      <TrustItem icon={TrendingUp} label="Portfolio snapshots" detail="Charts from real saved values" />
      <TrustItem icon={RefreshCw} label="Daily refresh ready" detail="Prices update outside the app server" />
      <TrustItem icon={ShieldCheck} label="User data isolated" detail="Supabase stores owned assets only" />
    </div>
  );
}

function TrustItem({ icon: Icon, label, detail }: { icon: LucideIcon; label: string; detail: string }) {
  return (
    <div className="rounded-[12px] border border-vault-border bg-vault-card/80 p-4 text-left">
      <div className="flex items-start gap-3">
        <Icon size={18} className="mt-0.5 text-vault-gold" />
        <div>
          <p className="text-sm font-medium text-vault-text">{label}</p>
          <p className="mt-1 text-xs leading-5 text-vault-muted">{detail}</p>
        </div>
      </div>
    </div>
  );
}

function ProductWorkflow() {
  return (
    <section className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="section-label">The actual VAULT loop</p>
          <h2 className="mt-4 font-serif text-4xl font-light leading-tight text-vault-text sm:text-6xl">
            Search it, vault it, track it.
          </h2>
          <p className="mt-5 text-sm leading-7 text-vault-muted">
            The landing page should show the product because the product is the pitch. This is the workflow beta users will actually feel on day one.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          <WorkflowCard
            icon={Search}
            eyebrow="Search"
            title="Find market-tracked items fast"
            body="Meilisearch powers the catalog so collectors can search by name, set, console, or category without loading the full catalog into Supabase."
          >
            <div className="rounded-[10px] border border-vault-border bg-vault-black p-3">
              <div className="flex items-center gap-2 rounded border border-vault-border bg-vault-card px-3 py-2 text-xs text-vault-muted">
                <Search size={14} />
                mew ex paldean fates
              </div>
              <div className="mt-3 rounded border border-vault-gold/20 bg-vault-gold/10 p-3">
                <p className="text-sm font-medium text-vault-text">Mew ex #53</p>
                <p className="mt-1 text-xs text-vault-muted">Paldean Fates &middot; Trading Card</p>
                <p className="data mt-3 text-vault-gold">$7,000 guide value</p>
              </div>
            </div>
          </WorkflowCard>

          <WorkflowCard
            icon={BarChart3}
            eyebrow="Track"
            title="Know gain before it becomes a chart"
            body="Cost basis, current value, previous close, and snapshots make the dashboard numbers real instead of decorative."
          >
            <div className="rounded-[10px] border border-vault-border bg-vault-black p-3">
              <div className="grid grid-cols-2 gap-3">
                <MiniMetric label="Paid" value="$4,200" detail="Cost basis" />
                <MiniMetric label="Guide" value="$7,000" detail="PSA 10" positive />
              </div>
              <div className="data mt-3 rounded border border-vault-green/20 bg-vault-green/10 px-3 py-2 text-sm text-vault-green">
                +$2,800 unrealized
              </div>
            </div>
          </WorkflowCard>

          <WorkflowCard
            icon={Camera}
            eyebrow="Prove"
            title="Store the story with the asset"
            body="Photos, receipts, certificates, notes, and condition labels stay attached to the item so the portfolio is useful beyond a price number."
          >
            <div className="rounded-[10px] border border-vault-border bg-vault-black p-3">
              <div className="grid grid-cols-3 gap-2">
                {["Photo", "Receipt", "COA"].map((label) => (
                  <div key={label} className="rounded border border-vault-border bg-vault-card p-3 text-center">
                    <FileCheck2 size={16} className="mx-auto text-vault-gold" />
                    <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-vault-muted">{label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-vault-muted">Last synced 4h ago &middot; Source: PriceCharting Guide Value</p>
            </div>
          </WorkflowCard>
        </div>
      </div>
    </section>
  );
}

function WorkflowCard({ icon: Icon, eyebrow, title, body, children }: { icon: LucideIcon; eyebrow: string; title: string; body: string; children: ReactNode }) {
  return (
    <article className="rounded-[16px] border border-vault-border bg-vault-card p-5 transition hover:-translate-y-1 hover:border-vault-gold/35">
      <div className="flex items-center gap-2 text-vault-gold">
        <Icon size={18} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em]">{eyebrow}</p>
      </div>
      <h3 className="mt-4 text-xl font-semibold text-vault-text">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-vault-muted">{body}</p>
      <div className="mt-5">{children}</div>
    </article>
  );
}

function CategoryPanel() {
  return (
    <div className="rounded-[18px] border border-vault-border bg-vault-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">Category allocation</p>
          <p className="mt-2 text-sm text-vault-muted">Demo portfolio composition</p>
        </div>
        <Sparkles size={20} className="text-vault-gold" />
      </div>

      <div className="mt-6 space-y-5">
        {allocation.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-vault-text">{row.label}</span>
              <span className="data text-vault-gold">{row.value}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-vault-black">
              <div className="h-full rounded-full bg-gradient-to-r from-vault-gold to-vault-green" style={{ width: row.width }} />
            </div>
            <p className="data mt-1 text-[10px] text-vault-faint">{row.pct} of total vault value</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <MiniMetric label="Crown jewel" value="Mew ex" detail="$7,000 guide value" />
        <MiniMetric label="Collector tier" value="Curator" detail="Based on demo value" />
      </div>
    </div>
  );
}

function MiniMetric({ label, value, detail, positive = false }: { label: string; value: string; detail: string; positive?: boolean }) {
  return (
    <div className="rounded-[10px] border border-vault-border bg-vault-black p-4">
      <p className="section-label">{label}</p>
      <p className={`data mt-2 text-xl ${positive ? "text-vault-green" : "text-vault-text"}`}>{value}</p>
      <p className="mt-1 text-xs text-vault-muted">{detail}</p>
    </div>
  );
}

function ValueCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <article className="rounded-[14px] border border-vault-gold/20 bg-vault-card p-6 transition hover:-translate-y-0.5 hover:border-vault-gold/45">
      <Icon size={22} className="text-vault-gold" />
      <h2 className="mt-5 text-xl font-semibold text-vault-text">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-vault-muted">{body}</p>
    </article>
  );
}
