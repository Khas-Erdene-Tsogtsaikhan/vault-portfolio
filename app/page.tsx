"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3, FileCheck2, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";

const categories = ["Trading Cards", "Pokemon", "Sports Cards", "Video Games", "Comics", "Coins", "Consoles", "More"];

const previewItems = [
  { name: "Mew ex PSA 10", set: "Paldean Fates", value: "$7,000", move: "+$420" },
  { name: "Charizard X ex", set: "Pokemon 151", value: "$4,850", move: "+$210" },
  { name: "PlayStation 2 Slim", set: "Console", value: "$162", move: "+$8" }
];

const chartPoints = [
  "0,150 35,136 70,142 105,118 140,124 175,96 210,105 245,78 280,66 315,44 350,52 385,24 420,30 455,18 490,10"
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
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-vault-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-serif text-xl font-light uppercase tracking-[0.28em] text-vault-gold">VAULT</Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded border border-vault-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-vault-muted transition hover:border-vault-bright hover:text-vault-text">Sign in</Link>
            <Link href="/signup" className="rounded bg-vault-gold px-4 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-vault-black transition hover:bg-vault-gold-light">Start free</Link>
          </div>
        </div>
      </header>

      <section className="relative min-h-[calc(100vh-73px)] overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-vault-gold/10 blur-3xl" />
        <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-vault-gold">Collectibles Portfolio Tracker</p>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl font-light leading-[0.95] text-vault-text sm:text-7xl lg:text-8xl">
            Your collection. Your portfolio.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-vault-muted sm:text-lg">
            Real market values. Daily price updates. Finally know what your collection is worth.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-vault-gold px-6 py-3 text-sm font-semibold text-vault-black transition hover:-translate-y-0.5 hover:bg-vault-gold-light">
              Create your vault
              <ArrowRight size={16} />
            </Link>
          </div>
          <p className="mt-5 text-xs leading-5 text-vault-muted">Used by collectors tracking $2M+ in combined collection value</p>

          <div className="mt-10 w-full">
            <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-vault-faint">Your dashboard. Live every morning.</p>
            <ProductPreview />
          </div>
          {checkingSession ? <p className="mt-4 text-[10px] uppercase tracking-[0.12em] text-vault-faint">Checking session...</p> : null}
        </div>
      </section>

      <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <ValueCard icon={BarChart3} title="Real market values" body="Powered by PriceCharting sold data. Not asking prices. What things actually sell for." />
          <ValueCard icon={RefreshCw} title="Updates every morning" body="Prices refresh daily at 4am. Open the app and see exactly how your collection moved overnight." />
          <ValueCard icon={FileCheck2} title="Your provenance vault" body="Store receipts, certificates, and photos for every piece. Your collection's paper trail." />
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="section-label">Built for every category</p>
          <div className="mt-6 flex gap-3 overflow-x-auto pb-3 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            {categories.map((category, index) => (
              <span key={category} className="shrink-0 rounded-full border border-vault-border bg-vault-card px-4 py-2 text-xs text-vault-muted" style={{ animationDelay: `${index * 70}ms` }}>
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl border-l border-vault-gold/60 pl-6 text-center sm:pl-10">
          <blockquote className="font-serif text-4xl font-light leading-tight text-vault-text sm:text-6xl">
            &ldquo;I spent years collecting. I had no idea what I actually had. Now I do.&rdquo;
          </blockquote>
          <p className="mt-6 text-sm text-vault-muted">- Early VAULT collector</p>
        </div>
      </section>

      <section className="px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-5xl font-light leading-none text-vault-text sm:text-7xl">Start knowing what your collection is worth.</h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-vault-muted">Free to start. No credit card required. Your first 10 items are on us.</p>
          <Link href="/signup" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded bg-vault-gold px-7 py-3 text-sm font-semibold text-vault-black transition hover:-translate-y-0.5 hover:bg-vault-gold-light">
            Create your vault
            <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-xs leading-5 text-vault-faint">Pricing: Free up to 10 items. Pro plan for unlimited tracking coming soon.</p>
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
          <p className="text-xs">© 2025 VAULT</p>
        </div>
      </footer>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="mx-auto max-w-5xl rounded-[18px] border border-vault-gold/20 bg-[#08080c] p-2 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
      <div className="rounded-[14px] border border-white/[0.06] bg-vault-card p-4 text-left sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-vault-border pb-4">
          <div>
            <p className="section-label">Portfolio Value</p>
            <p className="mt-1 font-serif text-5xl font-light text-vault-text sm:text-7xl">$284,150</p>
            <p className="data mt-2 inline-flex rounded border border-vault-green/20 bg-vault-green/10 px-3 py-1 text-xs text-vault-green">+ $8,420 · +3.05% today</p>
          </div>
          <div className="hidden rounded border border-vault-border bg-vault-black px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-vault-muted sm:block">
            PriceCharting Guide Value
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[10px] border border-vault-border bg-vault-black p-4">
            <svg viewBox="0 0 490 170" className="h-56 w-full overflow-visible">
              <defs>
                <linearGradient id="landingChart" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#2e9e5b" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#2e9e5b" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`M ${chartPoints[0]} L 490,170 L 0,170 Z`} fill="url(#landingChart)" />
              <polyline points={chartPoints[0]} fill="none" stroke="#50c98a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
            </svg>
          </div>
          <div className="space-y-3">
            {previewItems.map((item) => (
              <div key={item.name} className="rounded-[10px] border border-vault-border bg-vault-black p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-vault-text">{item.name}</p>
                    <p className="mt-1 text-xs text-vault-faint">{item.set}</p>
                  </div>
                  <div className="text-right">
                    <p className="data text-sm text-vault-gold">{item.value}</p>
                    <p className="data text-xs text-vault-green">{item.move}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-[10px] border border-vault-gold/25 bg-vault-gold/10 p-4">
              <div className="flex items-center gap-2 text-vault-gold">
                <ShieldCheck size={16} />
                <p className="text-sm font-medium">Receipts and photos attached</p>
              </div>
              <p className="mt-2 text-xs leading-5 text-vault-muted">Provenance records live beside every tracked item.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <article className="rounded-[12px] border border-vault-gold/20 bg-vault-card p-6 transition hover:-translate-y-0.5 hover:border-vault-gold/45">
      <Icon size={22} className="text-vault-gold" />
      <h2 className="mt-5 text-xl font-semibold text-vault-text">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-vault-muted">{body}</p>
    </article>
  );
}
