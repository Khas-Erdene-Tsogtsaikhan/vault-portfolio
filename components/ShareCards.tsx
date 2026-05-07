"use client";

import { X, Download, Image as ImageIcon, Sparkles, Trophy } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  categoryLabel,
  compactCurrency,
  currency,
  getCategoryBreakdown,
  getCurrentValue,
  getItemHighLow,
  getItemReturn,
  getPortfolioMetrics,
  getPrimaryPhoto,
  getTier,
  percent
} from "@/lib/portfolio-utils";
import type { VaultItem } from "@/lib/types";

type ShareMode = "item" | "collection";

export function ShareCardTrigger({
  mode,
  item,
  items,
  compact = false,
  className = ""
}: {
  mode: ShareMode;
  item?: VaultItem;
  items: VaultItem[];
  compact?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const disabled = mode === "item" ? !item : !items.length;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={className || (compact
          ? "inline-flex h-9 w-9 items-center justify-center rounded border border-vault-gold/30 bg-vault-gold/10 text-vault-gold transition hover:border-vault-gold"
          : "inline-flex items-center justify-center gap-2 rounded-md border border-vault-gold/30 bg-vault-gold/10 px-4 py-3 text-sm font-semibold text-vault-gold transition hover:border-vault-gold hover:bg-vault-gold/15 disabled:cursor-not-allowed disabled:opacity-50")}
        aria-label={mode === "item" ? `Create share card for ${item?.name ?? "item"}` : "Create collection wrapped card"}
      >
        {compact ? <ImageIcon size={15} /> : <><Sparkles size={16} /> {mode === "item" ? "Share Card" : "Collection Wrapped"}</>}
      </button>
      {open ? <ShareCardModal mode={mode} item={item} items={items} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function WrappedPrideCard({ items }: { items: VaultItem[] }) {
  return (
    <article className="relative overflow-hidden rounded-[10px] border border-vault-gold-dim bg-gradient-to-br from-[#141006] via-vault-card to-vault-black p-5">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-vault-gold/10 blur-3xl" />
      <div className="relative">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-vault-gold/30 bg-vault-gold/10 text-vault-gold">
          <Sparkles size={18} />
        </div>
        <p className="section-label mt-3">Viral Export</p>
        <h3 className="mt-1 min-h-14 font-serif text-[26px] font-normal leading-tight text-vault-text">Your collection Wrapped</h3>
        <p className="data mt-2 text-sm text-vault-gold">Export the portfolio card</p>
        <p className="mt-1 text-[11px] leading-5 text-vault-muted">A premium social card built for sharing your Vault.</p>
        <ShareCardTrigger
          mode="collection"
          items={items}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-vault-gold px-3 py-2.5 text-xs font-semibold text-vault-black transition hover:bg-vault-gold-light"
        />
      </div>
    </article>
  );
}

function ShareCardModal({ mode, item, items, onClose }: { mode: ShareMode; item?: VaultItem; items: VaultItem[]; onClose: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [format, setFormat] = useState<"story" | "square">("story");
  const [rendering, setRendering] = useState(false);
  const cardItems = mode === "item" && item ? [item] : items;

  async function downloadCard() {
    if (!cardRef.current) return;
    setRendering(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false
      });
      const link = document.createElement("a");
      link.download = mode === "item" && item ? `vault-${slug(item.name)}.png` : "vault-collection-wrapped.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setRendering(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/78 p-3 backdrop-blur-xl">
      <div className="grid max-h-[94vh] w-full max-w-6xl overflow-hidden rounded-xl border border-vault-border bg-[#0a0a0f] shadow-2xl lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-h-0 overflow-auto p-4 sm:p-6">
          <div className="mx-auto w-fit origin-top scale-[0.72] sm:scale-[0.82] lg:scale-100">
            <div ref={cardRef}>
              {mode === "item" && item
                ? <SingleItemShareCard item={item} format={format} />
                : <CollectionShareCard items={cardItems} format={format} />}
            </div>
          </div>
        </div>
        <aside className="border-t border-vault-border p-5 lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-label">Share Studio</p>
              <h2 className="mt-2 font-serif text-3xl font-light text-vault-text">{mode === "item" ? "Item flex card" : "Collection Wrapped"}</h2>
            </div>
            <button onClick={onClose} className="rounded border border-vault-border p-2 text-vault-muted transition hover:text-vault-text" aria-label="Close share card studio">
              <X size={16} />
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-vault-muted">Designed export, not an app screenshot. The PNG renders at 3x resolution for crisp story posts.</p>
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-vault-border bg-vault-black p-1">
            <button onClick={() => setFormat("story")} className={`rounded px-3 py-2 text-xs font-semibold ${format === "story" ? "bg-vault-gold text-vault-black" : "text-vault-muted"}`}>Story</button>
            <button onClick={() => setFormat("square")} className={`rounded px-3 py-2 text-xs font-semibold ${format === "square" ? "bg-vault-gold text-vault-black" : "text-vault-muted"}`}>Square</button>
          </div>
          <button onClick={downloadCard} disabled={rendering} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-vault-gold px-4 py-3 text-sm font-semibold text-vault-black transition hover:bg-vault-gold-light disabled:cursor-wait disabled:opacity-70">
            <Download size={16} />
            {rendering ? "Rendering PNG..." : "Download PNG"}
          </button>
          <p className="mt-3 text-xs leading-5 text-vault-faint">If a remote image refuses browser capture, VAULT still exports the card with a premium placeholder. Price and return data remain accurate.</p>
        </aside>
      </div>
    </div>,
    document.body
  );
}

function SingleItemShareCard({ item, format }: { item: VaultItem; format: "story" | "square" }) {
  const currentValue = getCurrentValue(item);
  const itemReturn = getItemReturn(item);
  const highLow = getItemHighLow(item);
  const isAth = currentValue >= highLow.high;
  const image = getPrimaryPhoto(item.photos)?.url;
  const sizeClass = format === "story" ? "h-[640px] w-[360px]" : "h-[360px] w-[360px]";

  return (
    <div className={`${sizeClass} share-card relative overflow-hidden rounded-[28px] border border-white/10 bg-[#07070a] p-6 text-[#f0ece8]`}>
      <ShareNoise />
      <ImageEcho image={image} />
      <CardWordmark />
      <div className={`${format === "story" ? "mt-16" : "mt-8"} flex flex-col items-center text-center`}>
        <div className={`${format === "story" ? "h-[220px] w-[220px]" : "h-[130px] w-[130px]"} relative overflow-hidden rounded-[16px] border border-[#c9a84c]/35 bg-[#111118] shadow-[0_24px_80px_rgba(201,168,76,0.12)]`}>
          {image ? <CardImage src={image} alt={item.name} /> : <CardPlaceholder label={categoryLabel(item.category)} />}
        </div>
        <h2 className={`${format === "story" ? "mt-6 text-[22px]" : "mt-4 text-[18px]"} line-clamp-2 max-w-[300px] font-sans font-medium leading-tight`}>{item.name}</h2>
        <p className="mt-2 max-w-[280px] truncate font-sans text-[13px] text-[rgba(240,236,232,0.5)]">{item.brand || categoryLabel(item.category)} / {item.condition}</p>
      </div>
      <div className={`${format === "story" ? "mt-8 pt-8" : "mt-5 pt-5"} border-t border-white/10`}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <ShareStat label="Guide Value" value={currency.format(currentValue)} />
          <ShareStat label="Paid" value={currency.format(item.costBasis)} />
          <ShareStat label="Return" value={percent.format(itemReturn.percentage)} positive={itemReturn.amount >= 0} />
        </div>
      </div>
      {isAth ? (
        <div className="mt-8 flex justify-center">
          <span className="rounded-full border border-[#c9a84c]/35 bg-[#c9a84c]/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#e2c47a] shadow-[0_0_40px_rgba(201,168,76,0.18)]">All Time High</span>
        </div>
      ) : null}
      <CardFooter />
    </div>
  );
}

function CollectionShareCard({ items, format }: { items: VaultItem[]; format: "story" | "square" }) {
  const metrics = getPortfolioMetrics(items);
  const topItems = [...items].sort((a, b) => getCurrentValue(b) - getCurrentValue(a)).slice(0, 3);
  const breakdown = getCategoryBreakdown(items);
  const topCategory = breakdown[0];
  const tier = getTier(metrics.totalValue);
  const sizeClass = format === "story" ? "h-[640px] w-[360px]" : "h-[360px] w-[360px]";
  const compact = format === "square";

  return (
    <div className={`${sizeClass} share-card relative overflow-hidden rounded-[28px] border border-white/10 bg-[#07070a] p-6 text-[#f0ece8]`}>
      <ShareNoise />
      <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-[#c9a84c]/[0.08] blur-3xl" />
      <div className="relative z-10 flex items-start justify-between">
        <CardWordmark inline />
        <span className="font-mono text-[10px] text-[rgba(240,236,232,0.25)]">{new Date().getFullYear()}</span>
      </div>
      <div className={`relative z-10 ${compact ? "mt-8" : "mt-14"}`}>
        <p className="font-sans text-[9px] uppercase tracking-[0.22em] text-[rgba(240,236,232,0.32)]">My Collection</p>
        <h2 className={`${compact ? "text-[52px]" : "text-[72px]"} mt-1 font-serif font-light leading-none text-[#c9a84c] drop-shadow-[0_0_26px_rgba(201,168,76,0.12)]`}>{compactCurrency.format(metrics.totalValue)}</h2>
        <div className="mt-3 inline-flex rounded-full bg-[#2e9e5b]/[0.12] px-3 py-2 font-mono text-[12px] text-[#2e9e5b]">
          +{currency.format(Math.max(0, metrics.totalReturn))} {percent.format(Math.max(0, metrics.totalReturnPercent))} all time
        </div>
      </div>
      <div className={`relative z-10 ${compact ? "mt-6" : "mt-10"} grid grid-cols-3 gap-2`}>
        <MiniCard label="Items" value={metrics.itemCount.toString()} />
        <MiniCard label="Best" value={percent.format(Math.max(0, getItemReturn(metrics.bestPerformer).percentage))} detail={metrics.bestPerformer.name} />
        <MiniCard label="Category" value={topCategory ? categoryLabel(topCategory.category) : "Vault"} detail={topCategory ? percent.format(topCategory.concentration) : "0%"} />
      </div>
      <div className={`relative z-10 ${compact ? "mt-5" : "mt-8"} border-t border-white/10 pt-5`}>
        <div className="grid grid-cols-3 gap-2">
          {topItems.map((topItem) => {
            const photo = getPrimaryPhoto(topItem.photos)?.url;
            return (
              <div key={topItem.id} className="min-w-0">
                <div className={`${compact ? "h-[58px]" : "h-[80px]"} relative overflow-hidden rounded-[10px] border border-white/10 bg-[#111118]`}>
                  {photo ? <CardImage src={photo} alt={topItem.name} /> : <CardPlaceholder label={topItem.category.slice(0, 2).toUpperCase()} />}
                </div>
                <p className="mt-2 truncate font-sans text-[10px] text-[rgba(240,236,232,0.72)]">{topItem.name}</p>
                <p className="font-mono text-[12px] text-[#c9a84c]">{compactCurrency.format(getCurrentValue(topItem))}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className={`relative z-10 ${compact ? "mt-5" : "mt-8"} flex justify-center`}>
        <span className="rounded-full border border-[#c9a84c]/35 bg-gradient-to-r from-[#c9a84c]/20 to-[#e2c47a]/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#e2c47a]">{tier} Collector</span>
      </div>
      <CardFooter label="vault.gg / Track your collection" />
    </div>
  );
}

function CardWordmark({ inline = false }: { inline?: boolean }) {
  return <div className={`${inline ? "" : "relative z-10"} font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-[#c9a84c]`}>VAULT</div>;
}

function CardFooter({ label = "vault.gg" }: { label?: string }) {
  return (
    <div className="absolute bottom-5 left-6 right-6 z-10 flex items-center justify-between font-mono text-[10px] text-[rgba(240,236,232,0.25)]">
      <span>{label}</span>
      <span>{new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
    </div>
  );
}

function ShareStat({ label, value, positive = false }: { label: string; value: string; positive?: boolean }) {
  return (
    <div>
      <p className="font-sans text-[9px] uppercase tracking-[0.14em] text-[rgba(240,236,232,0.32)]">{label}</p>
      <p className={`mt-2 truncate font-mono text-[18px] ${positive ? "text-[#2e9e5b]" : "text-[#f0ece8]"}`}>{value}</p>
    </div>
  );
}

function MiniCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-h-[78px] rounded-[8px] border border-white/10 bg-[#13131a]/80 p-3">
      <p className="font-sans text-[8px] uppercase tracking-[0.14em] text-[rgba(240,236,232,0.3)]">{label}</p>
      <p className="mt-2 truncate font-mono text-[15px] text-[#c9a84c]">{value}</p>
      {detail ? <p className="mt-1 truncate font-sans text-[9px] text-[rgba(240,236,232,0.42)]">{detail}</p> : null}
    </div>
  );
}

function CardImage({ src, alt }: { src: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} crossOrigin="anonymous" className="h-full w-full object-cover" />;
}

function CardPlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#0f0f14] text-center font-mono text-[11px] uppercase tracking-[0.12em] text-[#c9a84c]">
      {label}
    </div>
  );
}

function ImageEcho({ image }: { image?: string }) {
  if (!image) return <div className="absolute left-1/2 top-24 h-80 w-80 -translate-x-1/2 rounded-full bg-[#c9a84c]/[0.06] blur-3xl" />;
  return (
    <div className="absolute inset-0 opacity-[0.10] blur-3xl">
      <CardImage src={image} alt="" />
    </div>
  );
}

function ShareNoise() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center_top,rgba(201,168,76,0.09),transparent_55%)]" />
      <div className="absolute inset-0 opacity-40 [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%22.75%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22300%22 height=%22300%22 filter=%22url(%23n)%22 opacity=%22.035%22/%3E%3C/svg%3E')]" />
      <div className="absolute inset-0 rounded-[28px] shadow-[inset_0_0_0_1px_rgba(226,196,122,0.08),inset_0_0_80px_rgba(0,0,0,0.55)]" />
    </>
  );
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "share-card";
}
