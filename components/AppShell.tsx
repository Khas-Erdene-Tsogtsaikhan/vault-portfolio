"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Circle, FileText, Gem, Landmark, Plus, Settings, Trophy, User, Vault } from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import { categoryLabel, currency, getCategoryBreakdown, getNextTierProgress, getPortfolioMetrics } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

const links = [
  { href: "/", label: "Dashboard", icon: Landmark },
  { href: "/collection", label: "Collection", icon: Gem },
  { href: "/add", label: "Add", icon: Plus },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/market", label: "Market", icon: Trophy },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const items = useVaultStore((state) => state.items);
  const metrics = getPortfolioMetrics(items);
  const nextTier = getNextTierProgress(metrics.totalValue);
  const breakdown = getCategoryBreakdown(items);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-vault-border bg-vault-black/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-5 py-[18px] lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-serif text-xl font-light uppercase tracking-[0.28em] text-vault-gold">Vault</span>
            <span className="font-serif text-vault-muted">·</span>
            <span className="hidden text-xs uppercase tracking-[0.14em] text-vault-muted sm:inline">Collection OS</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {links.slice(0, 5).map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link key={link.href} href={link.href} className={`flex items-center gap-2 rounded px-4 py-1.5 text-xs uppercase tracking-[0.07em] transition ${active ? "bg-white/[0.05] text-vault-text" : "text-vault-faint hover:text-vault-muted"}`}>
                  <Icon size={13} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <TierBadge tier={metrics.tier} />
            {nextTier ? (
              <div className="hidden min-w-40 lg:block">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <span className="text-[9px] uppercase tracking-[0.14em] text-vault-faint">{nextTier.tier}</span>
                  <span className="data text-[9px] text-vault-gold">{currency.format(nextTier.away)}</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-vault-card">
                  <div className="h-full rounded-full bg-vault-gold" style={{ width: `${nextTier.progress * 100}%` }} />
                </div>
              </div>
            ) : null}
            <Link href="/add" className="hidden rounded bg-vault-gold px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-vault-black transition hover:bg-vault-gold-light sm:inline-flex">
              + Add Item
            </Link>
          </div>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-61px)]">
        <aside className="hidden w-[210px] shrink-0 border-r border-vault-border py-7 lg:flex lg:flex-col">
          <RailSection label="Overview" />
          {links.slice(0, 6).map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={`flex items-center gap-2 border-l-2 px-5 py-2.5 text-[13px] transition ${active ? "border-vault-gold bg-vault-gold/5 text-vault-gold" : "border-transparent text-vault-muted hover:bg-white/[0.025] hover:text-vault-text"}`}>
                <Icon size={15} />
                {link.label}
                {link.href === "/" ? <span className="data ml-auto text-[10px] text-vault-faint">{items.length}</span> : null}
              </Link>
            );
          })}

          <RailSection label="Collections" className="mt-3" />
          {breakdown.slice(0, 7).map((row) => (
            <Link key={row.category} href={`/collection?category=${row.category}`} className="flex items-center gap-2 border-l-2 border-transparent px-5 py-2.5 text-[13px] text-vault-muted transition hover:bg-white/[0.025] hover:text-vault-text">
              <Circle size={8} className="fill-vault-gold text-vault-gold" />
              {categoryLabel(row.category)}
              <span className="data ml-auto text-[10px] text-vault-faint">{row.count}</span>
            </Link>
          ))}
          <Link href="/add" className="flex items-center gap-2 border-l-2 border-transparent px-5 py-2.5 text-xs text-vault-faint transition hover:text-vault-muted">
            <Plus size={14} />
            New category
          </Link>

          <RailSection label="Vault" className="mt-3" />
          <Link href="/vault" className={`flex items-center gap-2 border-l-2 px-5 py-2.5 text-[13px] transition ${pathname === "/vault" ? "border-vault-gold bg-vault-gold/5 text-vault-gold" : "border-transparent text-vault-muted hover:bg-white/[0.025] hover:text-vault-text"}`}>
            <FileText size={15} />
            Documents
            <span className="data ml-auto text-[10px] text-vault-faint">{items.reduce((sum, item) => sum + item.documents.length, 0)}</span>
          </Link>
          <Link href="/profile" className={`flex items-center gap-2 border-l-2 px-5 py-2.5 text-[13px] transition ${pathname === "/profile" ? "border-vault-gold bg-vault-gold/5 text-vault-gold" : "border-transparent text-vault-muted hover:bg-white/[0.025] hover:text-vault-text"}`}>
            <User size={15} />
            Profile
          </Link>
          <Link href="/settings" className={`flex items-center gap-2 border-l-2 px-5 py-2.5 text-[13px] transition ${pathname === "/settings" ? "border-vault-gold bg-vault-gold/5 text-vault-gold" : "border-transparent text-vault-muted hover:bg-white/[0.025] hover:text-vault-text"}`}>
            <Settings size={15} />
            Settings
          </Link>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-11 lg:py-9">{children}</main>
      </div>
    </div>
  );
}

function RailSection({ label, className = "" }: { label: string; className?: string }) {
  return <div className={`px-6 pb-1 pt-3 text-[9px] uppercase tracking-[0.16em] text-vault-faint ${className}`}>{label}</div>;
}
