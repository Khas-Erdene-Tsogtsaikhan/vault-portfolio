"use client";

import { Download, Image as ImageIcon, Sparkles, X } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  categoryLabel,
  compactCurrency,
  currency,
  getCategoryBreakdown,
  getCurrentValue,
  getItemReturn,
  getPortfolioMetrics,
  getPrimaryPhoto,
  getTier,
  percent
} from "@/lib/portfolio-utils";
import type { VaultItem } from "@/lib/types";

type ShareMode = "item" | "collection";
type CollectionFormat = "portfolio" | "catalog";

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
        {compact ? <ImageIcon size={15} /> : <><Sparkles size={16} /> {mode === "item" ? "Lot Card" : "Collection Export"}</>}
      </button>
      {open ? <ShareCardModal mode={mode} item={item} items={items} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function WrappedPrideCard({ items }: { items: VaultItem[] }) {
  return (
    <article className="relative overflow-hidden rounded-[10px] border border-vault-gold-dim bg-gradient-to-br from-[#0b0a0c] via-[#111016] to-vault-black p-5">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-vault-gold/10 blur-3xl" />
      <div className="relative">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-vault-gold/30 bg-vault-gold/10 text-vault-gold">
          <Sparkles size={18} />
        </div>
        <p className="section-label mt-3">Export Studio</p>
        <h3 className="mt-1 min-h-14 font-serif text-[26px] font-normal leading-tight text-vault-text">Portfolio catalog cards</h3>
        <p className="data mt-2 text-sm text-vault-gold">Portfolio + museum view</p>
        <p className="mt-1 text-[11px] leading-5 text-vault-muted">Designed like an auction catalog, rendered as a crisp PNG.</p>
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
  const [format, setFormat] = useState<CollectionFormat>("portfolio");
  const [rendering, setRendering] = useState(false);

  async function downloadCard() {
    if (!cardRef.current) return;
    setRendering(true);
    try {
      await document.fonts.ready;
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: mode === "item" ? 3 : 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#07070a",
        logging: false,
        imageTimeout: 20000,
        removeContainer: true
      });
      const link = document.createElement("a");
      link.download = mode === "item" && item
        ? `vault-lot-${slug(item.name)}.png`
        : `vault-${format}-${new Date().getFullYear()}.png`;
      link.href = canvas.toDataURL("image/png", 1);
      link.click();
    } finally {
      setRendering(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/82 p-3 backdrop-blur-xl">
      <div className="grid max-h-[94vh] w-full max-w-7xl overflow-hidden rounded-xl border border-vault-border bg-[#08080b] shadow-2xl lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-h-0 overflow-auto p-4 sm:p-6">
          <div className="mx-auto w-fit origin-top scale-[0.42] sm:scale-[0.52] xl:scale-[0.68]">
            <div ref={cardRef}>
              {mode === "item" && item
                ? <SingleLotCard item={item} />
                : format === "portfolio"
                  ? <PortfolioCatalogCard items={items} />
                  : <MuseumCatalogCard items={items} />}
            </div>
          </div>
        </div>
        <aside className="border-t border-vault-border p-5 lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-label">Share Studio</p>
              <h2 className="mt-2 font-serif text-3xl font-light text-vault-text">{mode === "item" ? "Auction lot card" : "Collection export"}</h2>
            </div>
            <button onClick={onClose} className="rounded border border-vault-border p-2 text-vault-muted transition hover:text-vault-text" aria-label="Close share card studio">
              <X size={16} />
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-vault-muted">Editorial export cards with same-origin image proxying so real item photos render into the PNG.</p>
          {mode === "collection" ? (
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-lg border border-vault-border bg-vault-black p-1">
              <button onClick={() => setFormat("portfolio")} className={`rounded px-3 py-2 text-xs font-semibold ${format === "portfolio" ? "bg-vault-gold text-vault-black" : "text-vault-muted"}`}>Portfolio</button>
              <button onClick={() => setFormat("catalog")} className={`rounded px-3 py-2 text-xs font-semibold ${format === "catalog" ? "bg-vault-gold text-vault-black" : "text-vault-muted"}`}>Museum Catalog</button>
            </div>
          ) : null}
          <button onClick={downloadCard} disabled={rendering} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-vault-gold px-4 py-3 text-sm font-semibold text-vault-black transition hover:bg-vault-gold-light disabled:cursor-wait disabled:opacity-70">
            <Download size={16} />
            {rendering ? "Rendering PNG..." : "Download crisp PNG"}
          </button>
          <p className="mt-3 text-xs leading-5 text-vault-faint">Tip: wait for images to appear in the preview before downloading. The export uses a higher render scale than the preview.</p>
        </aside>
      </div>
    </div>,
    document.body
  );
}

function SingleLotCard({ item }: { item: VaultItem }) {
  const value = getCurrentValue(item);
  const itemReturn = getItemReturn(item);
  const image = getPrimaryPhoto(item.photos)?.url;

  return (
    <div className="share-export relative h-[420px] w-[405px] overflow-hidden border-l border-[#c9a84c]/45 bg-[#07070a] text-[#f0ece8]">
      <ShareTexture />
      <div className="absolute left-5 top-4 font-mono text-[11px] uppercase tracking-[0.18em] text-[rgba(240,236,232,0.28)]">Lot 001</div>
      <div className="absolute right-12 top-3 rounded-sm border border-[#c9a84c]/45 bg-[#c9a84c]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#e2c47a]">Crown Jewel</div>

      <div className="absolute left-0 right-0 top-[78px] flex justify-center">
        <div className="relative flex h-[108px] w-[108px] items-center justify-center overflow-hidden rounded-md bg-[#15131b] shadow-[0_34px_90px_rgba(69,54,115,0.25)]">
          {image ? <ExportImage src={image} alt={item.name} /> : <IconFallback label={categoryLabel(item.category).slice(0, 2)} />}
        </div>
      </div>

      <div className="absolute bottom-20 left-6 right-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[rgba(201,168,76,0.45)]">{categoryLabel(item.category)} / {item.brand || "Vault"}</p>
        <h2 className="mt-3 font-serif text-[25px] font-semibold leading-none text-white">{item.name}</h2>
        <p className="mt-2 truncate text-[14px] text-[rgba(240,236,232,0.42)]">{item.referenceNumber || item.pricechartingConsole || "Catalogued Asset"}</p>
        <div className="mt-5 grid grid-cols-2 gap-5 border-t border-white/10 pt-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(240,236,232,0.28)]">Value</p>
            <p className="mt-1 font-mono text-[18px] text-[#c9a84c]">{currency.format(value)}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(240,236,232,0.28)]">Return</p>
            <p className="mt-1 font-mono text-[18px] text-[#2e9e5b]">{itemReturn.amount >= 0 ? "+" : ""}{percent.format(itemReturn.percentage)}</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(240,236,232,0.28)]">Condition</p>
        <p className="mt-1 text-[14px] font-semibold text-white">{item.condition || "In Vault"}</p>
      </div>
      <div className="absolute bottom-6 right-8 font-serif text-[13px] uppercase tracking-[0.24em] text-[#c9a84c]">Vault</div>
    </div>
  );
}

function PortfolioCatalogCard({ items }: { items: VaultItem[] }) {
  const metrics = getPortfolioMetrics(items);
  const topItems = [...items].sort((a, b) => getCurrentValue(b) - getCurrentValue(a));
  const crown = topItems[0];
  const rest = topItems.slice(1, 7);
  const bestReturn = getItemReturn(metrics.bestPerformer);
  const topCategory = getCategoryBreakdown(items)[0];
  const tier = getTier(metrics.totalValue);

  return (
    <div className="share-export relative h-[1320px] w-[960px] overflow-hidden bg-[#07070a] p-8 text-[#f0ece8]">
      <ShareTexture />
      <p className="mb-10 text-center font-sans text-[14px] uppercase tracking-[0.22em] text-[rgba(240,236,232,0.22)]">Collection Portfolio Card - Full Collection View</p>
      <div className="overflow-hidden rounded-[26px] border border-[#c9a84c]/24 bg-[#09090d] shadow-[0_0_80px_rgba(201,168,76,0.05)]">
        <header className="grid grid-cols-[1fr_280px] border-b border-white/10 p-11">
          <div>
            <div className="mb-6 flex items-center gap-3 font-serif text-[16px] uppercase tracking-[0.26em] text-[#c9a84c]"><span className="h-px w-28 bg-[#c9a84c]" />VAULT</div>
            <h1 className="font-serif text-[44px] leading-none">My Collection</h1>
            <p className="mt-4 text-[16px] font-semibold text-[rgba(240,236,232,0.36)]">{topCategory ? categoryLabel(topCategory.category) : "Curated Assets"} / {items.length} items / Since {firstYear(items)}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[13px] uppercase tracking-[0.18em] text-[rgba(240,236,232,0.28)]">Portfolio Value</p>
            <p className="mt-4 font-serif text-[66px] leading-none"><span className="text-[rgba(240,236,232,0.22)]">$</span>{Math.round(metrics.totalValue).toLocaleString("en-US")}</p>
            <p className="mt-4 inline-flex rounded-full bg-[#2e9e5b]/15 px-4 py-2 font-mono text-[14px] text-[#2e9e5b]">+ {currency.format(Math.max(0, metrics.totalReturn))} / {percent.format(Math.max(0, metrics.totalReturnPercent))} all time</p>
          </div>
        </header>

        <section className="grid grid-cols-4 border-b border-white/10">
          <CatalogStat label="Best Return" value={percent.format(Math.max(0, bestReturn.percentage))} detail={metrics.bestPerformer.name} green />
          <CatalogStat label="Total Paid" value={currency.format(metrics.costBasis)} detail="cost basis" />
          <CatalogStat label="Unrealized" value={currency.format(Math.max(0, metrics.totalReturn))} detail="gain on paper" green />
          <CatalogStat label="Collector Tier" value={tier} detail={`top ${Math.max(1, Math.round(100 - metrics.percentile))}%`} gold />
        </section>

        {crown ? (
          <section className="border-b border-white/10 p-9">
            <SectionTitle label="Crown Jewel" />
            <div className="mt-5 grid grid-cols-[150px_1fr_180px] items-center gap-7 rounded-2xl border border-white/10 bg-[#13131a] p-5">
              <div className="relative flex h-[126px] items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#100f17]">
                {getPrimaryPhoto(crown.photos)?.url ? <ExportImage src={getPrimaryPhoto(crown.photos)?.url} alt={crown.name} /> : <IconFallback label="VA" />}
              </div>
              <div>
                <h2 className="font-sans text-[25px] font-bold">{crown.name}</h2>
                <p className="mt-2 text-[15px] text-[rgba(240,236,232,0.36)]">{crown.brand || categoryLabel(crown.category)} / {crown.condition}</p>
                <div className="mt-5 flex gap-3">
                  <BadgeText label="All Time High" gold />
                  <BadgeText label="Best Performer" />
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-[30px] text-white">{currency.format(getCurrentValue(crown))}</p>
                <p className="mt-2 font-mono text-[15px] text-[#2e9e5b]">+{currency.format(Math.max(0, getItemReturn(crown).amount))} / {percent.format(Math.max(0, getItemReturn(crown).percentage))}</p>
                <p className="mt-2 text-[13px] text-[rgba(240,236,232,0.35)]">paid {currency.format(crown.costBasis)}</p>
              </div>
            </div>
          </section>
        ) : null}

        <section className="p-9">
          <SectionTitle label="Rest of Collection" />
          <div className="mt-5 grid grid-cols-3 gap-3">
            {rest.map((item) => <PortfolioTile key={item.id} item={item} />)}
          </div>
        </section>

        <footer className="absolute bottom-8 left-8 right-8 flex items-center justify-between border-t border-white/10 px-12 py-7">
          <div className="rounded-full border border-[#c9a84c]/25 bg-[#c9a84c]/10 px-6 py-3 font-serif text-[13px] uppercase tracking-[0.22em] text-[#e2c47a]">{tier} Collector</div>
          <div className="text-right font-mono text-[12px] text-[rgba(240,236,232,0.20)]">vault.gg<br />{todayLabel()}</div>
        </footer>
      </div>
    </div>
  );
}

function MuseumCatalogCard({ items }: { items: VaultItem[] }) {
  const topItems = [...items].sort((a, b) => getCurrentValue(b) - getCurrentValue(a)).slice(0, 8);
  const metrics = getPortfolioMetrics(items);
  const tier = getTier(metrics.totalValue);

  return (
    <div className="share-export relative h-[1200px] w-[820px] overflow-hidden bg-[#07070a] p-8 text-[#f0ece8]">
      <ShareTexture />
      <div className="mb-14 grid grid-cols-[36px_1fr_210px] items-center gap-5 font-mono text-[11px] text-[rgba(240,236,232,0.30)]">
        <span>01</span>
        <span className="flex items-center gap-5"><span>The Museum Catalog</span><span className="h-px flex-1 bg-white/10" /></span>
        <span className="text-right italic">Collected, valued, preserved</span>
      </div>

      <section className="border border-white/10 bg-[#08080b]">
        <header className="grid grid-cols-[1fr_180px] p-12">
          <div>
            <h1 className="font-serif text-[45px] leading-none">My<br /><span className="italic text-[rgba(240,236,232,0.54)]">Collection</span></h1>
          </div>
          <div className="text-right">
            <p className="font-serif text-[52px] leading-none text-[rgba(240,236,232,0.08)]">{new Date().getFullYear()}</p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[rgba(240,236,232,0.25)]">{items.length} pieces curated</p>
            <p className="mt-3 font-mono text-[13px] text-[#2e9e5b]">{currency.format(metrics.totalValue)} total value</p>
          </div>
        </header>

        <div className="grid grid-cols-3">
          {topItems.map((item, index) => (
            <MuseumTile key={item.id} item={item} index={index} featured={index === 0} />
          ))}
        </div>

        <footer className="flex items-center justify-between border-t border-white/10 px-12 py-8">
          <span className="font-serif text-[14px] uppercase tracking-[0.22em] text-[#c9a84c]">VAULT</span>
          <span className="font-mono text-[11px] text-[rgba(240,236,232,0.22)]">vault.gg / {todayLabel()} / {items.length} items / {tier}</span>
        </footer>
      </section>
    </div>
  );
}

function PortfolioTile({ item }: { item: VaultItem }) {
  const photo = getPrimaryPhoto(item.photos)?.url;
  const itemReturn = getItemReturn(item);
  return (
    <article className="h-[290px] overflow-hidden rounded-xl border border-white/10 bg-[#111118] p-4">
      <div className="relative flex h-[165px] items-center justify-center overflow-hidden rounded-lg bg-[#0c0b12]">
        {photo ? <ExportImage src={photo} alt={item.name} /> : <IconFallback label={categoryLabel(item.category).slice(0, 2)} />}
      </div>
      <p className="mt-5 truncate text-[15px] font-semibold text-[rgba(240,236,232,0.72)]">{item.name}</p>
      <p className="mt-2 font-mono text-[18px] text-[#c9a84c]">{currency.format(getCurrentValue(item))}</p>
      <p className="mt-1 font-mono text-[12px] text-[#2e9e5b]">+{currency.format(Math.max(0, itemReturn.amount))} / {percent.format(Math.max(0, itemReturn.percentage))}</p>
    </article>
  );
}

function MuseumTile({ item, index, featured }: { item: VaultItem; index: number; featured?: boolean }) {
  const photo = getPrimaryPhoto(item.photos)?.url;
  return (
    <article className={`${featured ? "col-span-2 h-[310px]" : "h-[260px]"} relative border-t border-white/10 bg-[#0d0d13] p-5`}>
      <div className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.16em] text-[rgba(240,236,232,0.25)]">No. {String(index + 1).padStart(3, "0")}</div>
      {featured ? <div className="absolute left-4 top-11 border border-[#c9a84c]/35 bg-[#c9a84c]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-[#c9a84c]">Crown Jewel</div> : null}
      <div className="flex h-full items-center justify-center pb-12">
        <div className={`${featured ? "h-[115px] w-[115px]" : "h-[76px] w-[76px]"} relative overflow-hidden rounded-md bg-[#14121b]`}>
          {photo ? <ExportImage src={photo} alt={item.name} /> : <IconFallback label={item.name.slice(0, 2)} />}
        </div>
      </div>
      <div className="absolute bottom-4 left-5 right-5">
        <p className="font-serif text-[16px] leading-tight text-white">{item.name}</p>
        <p className="mt-1 truncate text-[11px] text-[rgba(240,236,232,0.38)]">{item.condition || categoryLabel(item.category)}</p>
        <p className="mt-1 font-mono text-[12px] text-[#2e9e5b]">{currency.format(getCurrentValue(item))}</p>
      </div>
    </article>
  );
}

function CatalogStat({ label, value, detail, green, gold }: { label: string; value: string; detail: string; green?: boolean; gold?: boolean }) {
  return (
    <div className="border-r border-white/10 p-7 last:border-r-0">
      <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-[rgba(240,236,232,0.25)]">{label}</p>
      <p className={`mt-3 font-mono text-[25px] ${green ? "text-[#2e9e5b]" : gold ? "text-[#c9a84c]" : "text-white"}`}>{value}</p>
      <p className="mt-2 text-[13px] text-[rgba(240,236,232,0.36)]">{detail}</p>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-5">
      <p className="font-mono text-[13px] uppercase tracking-[0.20em] text-[rgba(240,236,232,0.28)]">{label}</p>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function BadgeText({ label, gold = false }: { label: string; gold?: boolean }) {
  return <span className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.13em] ${gold ? "border-[#c9a84c]/35 bg-[#c9a84c]/10 text-[#c9a84c]" : "border-[#2e9e5b]/30 bg-[#2e9e5b]/10 text-[#2e9e5b]"}`}>{label}</span>;
}

function ExportImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) return <IconFallback label="VA" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={shareImageSrc(src)} alt={alt} crossOrigin="anonymous" className="h-full w-full object-contain p-2" />;
}

function IconFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md bg-gradient-to-br from-[#1a1622] to-[#0b0a10] font-mono text-[18px] uppercase tracking-[0.14em] text-[#c9a84c]">
      {label}
    </div>
  );
}

function ShareTexture() {
  return (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(86,64,130,0.14),transparent_32%),radial-gradient(circle_at_82%_8%,rgba(201,168,76,0.07),transparent_30%)]" />
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] [background-size:36px_36px]" />
      <div className="absolute inset-0 opacity-35 [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22300%22 height=%22300%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%22.82%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22300%22 height=%22300%22 filter=%22url(%23n)%22 opacity=%22.03%22/%3E%3C/svg%3E')]" />
    </>
  );
}

function shareImageSrc(src: string) {
  if (src.startsWith("data:")) return src;
  if (src.startsWith("/api/")) return src;
  if (src.startsWith("/")) return src;
  return `/api/share/image?url=${encodeURIComponent(src)}`;
}

function firstYear(items: VaultItem[]) {
  const years = items.map((item) => new Date(item.acquiredDate || item.createdAt).getFullYear()).filter(Number.isFinite);
  return years.length ? Math.min(...years).toString() : new Date().getFullYear().toString();
}

function todayLabel() {
  return new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "share-card";
}
