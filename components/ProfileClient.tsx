"use client";

import type { LucideIcon } from "lucide-react";
import { Award, Clock3, Diamond, Download, Flame, Grid2X2, Medal, Sparkles, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AssetImage } from "@/components/AssetImage";
import { AuthCard } from "@/components/AuthCard";
import { Badge } from "@/components/Badge";
import { TierBadge } from "@/components/TierBadge";
import { currency, getItemReturn, getNextTierProgress, getPortfolioMetrics, getPrimaryPhoto, percent } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

export function ProfileClient() {
  const items = useVaultStore((state) => state.items);
  const user = useVaultStore((state) => state.user);
  const metrics = getPortfolioMetrics(items);
  const nextTier = getNextTierProgress(metrics.totalValue);
  const hasDiamondHands = items.some((item) => new Date(item.acquiredDate) <= new Date("2024-05-05T00:00:00Z"));
  const hasTopPerformer = items.some((item) => getItemReturn(item).percentage >= 1);
  const hasRareFind = items.some((item) => (item.population && item.population < 100) || (item.salesLast30Days && item.salesLast30Days < 50) || (item.editionTotal && item.editionTotal < 100));

  return (
    <AppShell>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(440px,520px)]">
        <div className="vault-panel rounded-lg p-6">
          <p className="section-label">Collector Identity</p>
          <h1 className="mt-3 font-serif text-6xl font-light text-vault-text">@{user.username}</h1>
          <div className="mt-5 flex flex-wrap gap-3">
            <TierBadge tier={metrics.tier} />
            <Badge tone="gold">Top {metrics.percentile}%</Badge>
            <Badge tone="green">{metrics.acquisitionStreak} month streak</Badge>
          </div>

          {nextTier ? (
            <div className="mt-7 rounded-md border border-vault-border bg-vault-surface p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="section-label">{nextTier.tier} Progress</p>
                <p className="data text-xs text-vault-gold">{currency.format(nextTier.away)} away</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-vault-black">
                <div className="h-full rounded-full bg-vault-gold" style={{ width: `${nextTier.progress * 100}%` }} />
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-4">
            <ProfileStat label="Value" value={currency.format(metrics.totalValue)} />
            <ProfileStat label="Items" value={String(metrics.itemCount)} />
            <ProfileStat label="Return" value={percent.format(metrics.totalReturnPercent)} />
            <ProfileStat label="Docs" value={`${metrics.documentedScore}%`} />
          </div>
        </div>
        <AuthCard />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">Badges</p>
          <div className="mt-5 grid gap-3">
            <BadgeRow icon={Flame} title="Streak" detail="Added an item every month for 3+ months" active={metrics.acquisitionStreak >= 3} />
            <BadgeRow icon={TrendingUp} title="Market Beater" detail="Portfolio outperforming the benchmark index" active={metrics.totalReturnPercent > 0.042} />
            <BadgeRow icon={Diamond} title="Diamond Hands" detail="Held a piece for 2+ years" active={hasDiamondHands} />
            <BadgeRow icon={Award} title="Top Performer" detail="One item is up 100%+ from cost basis" active={hasTopPerformer} />
            <BadgeRow icon={Sparkles} title="Rare Find" detail="Owns a scarce item by population or liquidity" active={hasRareFind} />
            <BadgeRow icon={Medal} title="10 Items Catalogued" detail="First collection breadth milestone" active={metrics.itemCount >= 10} />
            <BadgeRow icon={Grid2X2} title="Documented Category" detail="Provenance depth across the vault" active={metrics.documentedScore > 80} />
            <BadgeRow icon={Clock3} title="Always On" detail="Daily portfolio tracking is ready" active />
          </div>
        </div>
        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">Vault Wrapped Preview</p>
          <div className="mt-5 grid gap-4 bg-vault-black p-5 sm:grid-cols-[1fr_1fr]">
            <div>
              <p className="font-serif text-5xl font-light text-vault-gold">{currency.format(metrics.totalValue)}</p>
              <p className="mt-3 text-vault-muted">{metrics.itemCount} objects · {metrics.tier} tier · {percent.format(metrics.totalReturnPercent)} return</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {items.slice(0, 4).map((item) => <div key={item.id} className="relative aspect-square overflow-hidden rounded-md border border-vault-border"><AssetImage src={getPrimaryPhoto(item.photos)?.url} alt="" sizes="130px" /></div>)}
            </div>
          </div>
          <button className="mt-4 flex items-center gap-2 rounded-md border border-vault-border px-4 py-3 text-vault-text"><Download size={16} /> Download share card stub</button>
        </div>
      </section>
    </AppShell>
  );
}

function ProfileStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-vault-border bg-vault-surface p-4"><p className="section-label">{label}</p><p className="data mt-2 text-xl text-vault-text">{value}</p></div>;
}

function BadgeRow({ icon: Icon, title, detail, active }: { icon: LucideIcon; title: string; detail: string; active: boolean }) {
  return (
    <div className={`flex items-start gap-3 rounded-md border p-4 ${active ? "border-vault-gold/35 bg-vault-gold/10 text-vault-gold" : "border-vault-border bg-vault-surface text-vault-muted"}`}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-vault-muted">{detail}</span>
      </span>
    </div>
  );
}
