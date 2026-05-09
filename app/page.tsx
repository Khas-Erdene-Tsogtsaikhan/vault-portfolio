"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, Clock3, Database, FileCheck2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const categories = ["Trading Cards", "Pokemon", "Sports Cards", "Video Games", "Comics", "Coins", "Consoles", "Watches"];

const productScreenshots = [
  {
    label: "Collection",
    title: "Every position in one table.",
    body: "Filter, sort, and inspect holdings with value, daily movement, documents, and liquidity controls.",
    src: "/landing-collection-preview.png",
    alt: "VAULT collection page showing assets, values, daily movement, documents, and offer controls"
  },
  {
    label: "Add",
    title: "Search, select, and add.",
    body: "Search guide values, review selected positions, and add items with real portfolio weight.",
    src: "/landing-add-preview.png",
    alt: "VAULT add page showing search mode, selected positions, and add selected action"
  },
  {
    label: "Vault",
    title: "Proof beside the asset.",
    body: "Receipts, certificates, photos, and completion depth stay attached to the collection.",
    src: "/landing-vault-preview.png",
    alt: "VAULT documents page showing receipts, certificates, photos, and provenance completion"
  }
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
    <main className="relative min-h-screen overflow-x-hidden bg-vault-black text-vault-text">
      <div aria-hidden className="landing-aurora" />
      <div aria-hidden className="landing-grid" />
      <div aria-hidden className="landing-sheen" />

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-vault-black/78 backdrop-blur-2xl">
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

      <section className="relative z-10 overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="landing-hero-glow" />
        <div className="absolute inset-x-0 top-[390px] h-px bg-gradient-to-r from-transparent via-vault-gold/35 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-vault-gold">Collectibles Portfolio Tracker</p>
            <h1 className="landing-headline mt-5 font-serif text-5xl font-light leading-[0.92] text-vault-text sm:text-7xl lg:text-8xl">
              Your collection. Your portfolio.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-vault-muted sm:text-lg">
              Track collectibles with market values, daily movement, documents, photos, cost basis, and portfolio charts in one private vault.
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
            <div className="landing-proof mx-auto mt-7 max-w-xl px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-vault-faint">Used by collectors tracking</p>
              <p className="landing-gold-text data mt-2 text-3xl sm:text-5xl">$2M+</p>
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-vault-muted">in combined collection value</p>
            </div>
          </div>

          <div className="mt-10">
            <p className="mb-3 text-center text-[10px] uppercase tracking-[0.22em] text-vault-faint">Dashboard preview</p>
            <DashboardPreviewImage />
          </div>

          {checkingSession ? <p className="mt-5 text-center text-[10px] uppercase tracking-[0.12em] text-vault-faint">Checking session...</p> : null}
        </div>
      </section>

      <section className="relative z-10 border-y border-white/[0.06] bg-[#08080c]/80 px-4 py-16 backdrop-blur-sm sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <ValueCard icon={Database} title="Real guide values" body="Search market-tracked products, save the right condition, and keep manual estimates when a piece needs your own value." />
          <ValueCard icon={Clock3} title="Daily portfolio movement" body="Snapshots turn your collection into a real chart, so values and deltas move when the portfolio changes." />
          <ValueCard icon={FileCheck2} title="Proof with every item" body="Receipts, certificates, photos, notes, condition, and cost basis stay attached to the asset." />
        </div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="section-label">Product views</p>
              <h2 className="mt-4 max-w-3xl font-serif text-4xl font-light leading-tight text-vault-text sm:text-6xl">
                The rest of the vault, not a mockup.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-vault-muted">
              Every item in your vault behaves like a position. Daily deltas, all-time returns, category allocation, and provenance records live in one terminal.
            </p>
          </div>

          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {productScreenshots.map((screenshot) => (
              <ProductScreenshotCard key={screenshot.src} screenshot={screenshot} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="section-label">Built for every category</p>
              <h2 className="mt-4 max-w-3xl font-serif text-4xl font-light leading-tight text-vault-text sm:text-6xl">
                One clean portfolio for the whole collection.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-vault-muted">
              Cards, consoles, comics, sealed product, sports cards, and one-off pieces can live in the same dashboard without turning into a spreadsheet.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <div key={category} className="landing-category group rounded-[14px] border border-vault-gold/15 bg-[linear-gradient(135deg,rgba(201,168,76,0.08),rgba(255,255,255,0.02))] p-[1px] transition hover:-translate-y-0.5 hover:border-vault-gold/35">
                <div className="rounded-[13px] bg-vault-card/90 px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-vault-text">{category}</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-vault-gold opacity-70 transition group-hover:opacity-100" />
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-vault-faint">Supported category</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 border-t border-white/[0.06] px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif text-5xl font-light leading-none text-vault-text sm:text-7xl">
            Know what your collection is worth.
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-vault-muted">
            Add your first items, attach proof, and let the dashboard become the place you check your collection like a portfolio.
          </p>
          <Link href="/signup" className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded bg-vault-gold px-7 py-3 text-sm font-semibold text-vault-black transition hover:-translate-y-0.5 hover:bg-vault-gold-light">
            Create your vault
            <ArrowRight size={16} />
          </Link>
          <p className="mt-4 text-xs leading-5 text-vault-faint">Free to start. No credit card required.</p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] px-4 py-8 sm:px-6 lg:px-8">
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

function DashboardPreviewImage() {
  return (
    <div className="landing-dashboard-frame mx-auto max-w-7xl rounded-[24px] border border-vault-gold/20 bg-[#050507] p-2 shadow-[0_42px_150px_rgba(0,0,0,0.62)]">
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
          <div className="data text-[10px] text-vault-green">Product screenshot</div>
        </div>
        <div className="relative overflow-hidden bg-vault-black">
          <Image
            src="/landing-dashboard-preview.png"
            alt="VAULT dashboard showing portfolio value, collection stats, and tracked assets"
            width={1900}
            height={940}
            priority
            className="h-auto w-full"
            sizes="(max-width: 768px) 100vw, 1280px"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-vault-black to-transparent" />
        </div>
      </div>
    </div>
  );
}

function ProductScreenshotCard({ screenshot }: { screenshot: (typeof productScreenshots)[number] }) {
  return (
    <article className="landing-product-card group overflow-hidden rounded-[16px] border border-vault-border bg-vault-card transition hover:-translate-y-1 hover:border-vault-gold/35">
      <div className="relative aspect-[16/10] overflow-hidden border-b border-vault-border bg-vault-black">
        <Image
          src={screenshot.src}
          alt={screenshot.alt}
          width={1600}
          height={1000}
          className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.025]"
          sizes="(max-width: 1024px) 100vw, 33vw"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-vault-card to-transparent" />
      </div>
      <div className="p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-vault-gold">{screenshot.label}</p>
        <h3 className="mt-3 text-xl font-semibold text-vault-text">{screenshot.title}</h3>
        <p className="mt-3 text-sm leading-6 text-vault-muted">{screenshot.body}</p>
      </div>
    </article>
  );
}

function ValueCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <article className="landing-value-card rounded-[14px] border border-vault-gold/20 bg-vault-card p-6 transition hover:-translate-y-0.5 hover:border-vault-gold/45">
      <Icon size={22} className="text-vault-gold" />
      <h2 className="mt-5 text-xl font-semibold text-vault-text">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-vault-muted">{body}</p>
    </article>
  );
}
