"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Circle, FileText, Gem, Landmark, Plus, Settings, Trophy, User, Vault } from "lucide-react";
import { TierBadge } from "@/components/TierBadge";
import { categoryLabel, currency, getCategoryBreakdown, getNextTierProgress, getPortfolioMetrics } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: Landmark },
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
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-50 border-b border-vault-border bg-vault-black/95 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5 lg:px-10">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="font-serif text-xl font-light uppercase tracking-[0.22em] text-vault-gold sm:tracking-[0.28em]">Vault</span>
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

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
            <Link href="/add" className="inline-flex h-9 w-9 items-center justify-center rounded bg-vault-gold text-vault-black transition hover:bg-vault-gold-light sm:h-auto sm:w-auto sm:px-5 sm:py-2 sm:text-xs sm:font-semibold sm:uppercase sm:tracking-[0.08em]" aria-label="Add item">
              <Plus size={16} className="sm:hidden" />
              <span className="hidden sm:inline">+ Add Item</span>
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
                {link.href === "/dashboard" ? <span className="data ml-auto text-[10px] text-vault-faint">{items.length}</span> : null}
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
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-8 sm:py-7 lg:px-11 lg:py-9">{children}</main>
      </div>
      <MobileNav pathname={pathname} />
    </div>
  );
}

function RailSection({ label, className = "" }: { label: string; className?: string }) {
  return <div className={`px-6 pb-1 pt-3 text-[9px] uppercase tracking-[0.16em] text-vault-faint ${className}`}>{label}</div>;
}

function MobileNav({ pathname }: { pathname: string }) {
  const primary = links.slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-vault-border bg-vault-black/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-18px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl md:hidden" aria-label="Mobile navigation">
      <div className="grid grid-cols-5 gap-1">
        {primary.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-md px-1 py-2 text-[10px] transition ${
                active ? "bg-vault-gold/10 text-vault-gold" : "text-vault-faint hover:text-vault-muted"
              }`}
            >
              <Icon size={18} />
              <span className="max-w-full truncate">{link.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="mt-1 grid grid-cols-3 gap-1">
        {links.slice(5).map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 text-[10px] uppercase tracking-[0.06em] transition ${
                active ? "border-vault-gold/40 bg-vault-gold/10 text-vault-gold" : "border-vault-border text-vault-faint"
              }`}
            >
              <Icon size={13} />
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
