"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BarChart3, Clock3, Database, FileCheck2, RefreshCw, ShieldCheck, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

const categories = ["Trading Cards", "Pokemon", "Sports Cards", "Video Games", "Comics", "Coins", "Consoles", "Watches"];

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

      <section className="relative overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="absolute inset-x-0 top-0 h-[680px] bg-[radial-gradient(ellipse_at_top,rgba(201,168,76,0.15),rgba(7,7,10,0)_68%)]" />
        <div className="absolute inset-x-0 top-[390px] h-px bg-gradient-to-r from-transparent via-vault-gold/20 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-vault-gold">Collectibles Portfolio Tracker</p>
            <h1 className="mt-5 font-serif text-5xl font-light leading-[0.92] text-vault-text sm:text-7xl lg:text-8xl">
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
            <p className="mt-5 text-xs leading-5 text-vault-muted">Used by collectors tracking $2M+ in combined collection value</p>
          </div>

          <div className="mt-10">
            <p className="mb-3 text-center text-[10px] uppercase tracking-[0.22em] text-vault-faint">Dashboard preview</p>
            <DashboardPreviewImage />
          </div>

          <TrustStrip />
          {checkingSession ? <p className="mt-5 text-center text-[10px] uppercase tracking-[0.12em] text-vault-faint">Checking session...</p> : null}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-[#08080c] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-4 md:grid-cols-3">
          <ValueCard icon={Database} title="Real guide values" body="Search market-tracked products, save the right condition, and keep manual estimates when a piece needs your own value." />
          <ValueCard icon={Clock3} title="Daily portfolio movement" body="Snapshots turn your collection into a real chart, so values and deltas move when the portfolio changes." />
          <ValueCard icon={FileCheck2} title="Proof with every item" body="Receipts, certificates, photos, notes, condition, and cost basis stay attached to the asset." />
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
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
          <div className="mt-8 flex gap-3 overflow-x-auto pb-3 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
            {categories.map((category) => (
              <span key={category} className="shrink-0 rounded-full border border-vault-border bg-vault-card px-4 py-2 text-xs text-vault-muted">
                {category}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-4 py-24 text-center sm:px-6 lg:px-8">
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

function DashboardPreviewImage() {
  return (
    <div className="mx-auto max-w-7xl rounded-[24px] border border-vault-gold/20 bg-[#050507] p-2 shadow-[0_42px_150px_rgba(0,0,0,0.62)]">
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

function TrustStrip() {
  return (
    <div className="mx-auto mt-8 grid max-w-5xl gap-3 sm:grid-cols-3">
      <TrustItem icon={TrendingUp} label="Portfolio snapshots" detail="Charts from saved portfolio values" />
      <TrustItem icon={RefreshCw} label="Daily refresh ready" detail="Catalog prices sync outside the app server" />
      <TrustItem icon={ShieldCheck} label="Private vault data" detail="Supabase stores user-owned assets only" />
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

function ValueCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <article className="rounded-[14px] border border-vault-gold/20 bg-vault-card p-6 transition hover:-translate-y-0.5 hover:border-vault-gold/45">
      <Icon size={22} className="text-vault-gold" />
      <h2 className="mt-5 text-xl font-semibold text-vault-text">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-vault-muted">{body}</p>
    </article>
  );
}
