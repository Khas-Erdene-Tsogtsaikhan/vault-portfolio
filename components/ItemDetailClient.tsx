"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Download, FileText, FileUp, ImagePlus, Pencil, Save, Share2, Trash2 } from "lucide-react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AssetImage } from "@/components/AssetImage";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/Badge";
import { OpenToOffersControl } from "@/components/OpenToOffersControl";
import {
  categoryLabel,
  currency,
  getCompletenessScore,
  getItemDailyDelta,
  getItemHighLow,
  getItemReturn,
  getLiquidity,
  percent,
  preciseCurrency
} from "@/lib/portfolio-utils";
import type { MarketComp, VaultItem } from "@/lib/types";
import { useVaultStore } from "@/lib/vault-store";

export function ItemDetailClient({ id }: { id: string }) {
  const items = useVaultStore((state) => state.items);
  const updateEstimate = useVaultStore((state) => state.updateEstimate);
  const updateItemDetails = useVaultStore((state) => state.updateItemDetails);
  const addProofFiles = useVaultStore((state) => state.addProofFiles);
  const removePhoto = useVaultStore((state) => state.removePhoto);
  const item = items.find((candidate) => candidate.id === id);
  const [activePhoto, setActivePhoto] = useState(0);
  const [estimate, setEstimate] = useState(item?.currentValueUser.toString() ?? "");
  const [editForm, setEditForm] = useState({
    name: item?.name ?? "",
    brand: item?.brand ?? "",
    referenceNumber: item?.referenceNumber ?? "",
    condition: item?.condition ?? "",
    costBasis: item?.costBasis.toString() ?? "",
    currentValueUser: item?.currentValueUser.toString() ?? "",
    acquiredDate: item?.acquiredDate ?? "",
    acquiredFrom: item?.acquiredFrom ?? "",
    notes: item?.notes ?? "",
    story: item?.story ?? ""
  });
  const [proofToast, setProofToast] = useState("");
  const shareText = useMemo(() => item ? `${item.name}: ${currency.format(item.costBasis)} to ${currency.format(item.currentValueUser)} (${percent.format(getItemReturn(item).percentage)})` : "", [item]);

  if (!item) {
    return (
      <AppShell>
        <div className="vault-panel rounded-lg p-10 text-center">
          <h1 className="font-serif text-5xl font-light text-vault-text">Asset file not found.</h1>
          <Link href="/collection" className="mt-5 inline-flex rounded-md bg-vault-gold px-5 py-3 font-semibold text-vault-black">Return to collection</Link>
        </div>
      </AppShell>
    );
  }

  const itemReturn = getItemReturn(item);
  const daily = getItemDailyDelta(item);
  const highLow = getItemHighLow(item);
  const chartData = item.priceHistory.map((point) => ({
    date: new Date(point.recordedAt).toLocaleDateString("en-US", { month: "short" }),
    value: point.value,
    costBasis: item.costBasis
  }));
  const comps = buildMarketComps(item);

  return (
    <AppShell>
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <div className="relative h-[520px] overflow-hidden rounded-lg border border-vault-border bg-vault-card">
            {item.photos[activePhoto]?.url ? (
              <AssetImage src={item.photos[activePhoto].url} alt={item.name} priority sizes="(min-width:1024px) 50vw, 100vw" />
            ) : (
              <div className="flex h-full items-center justify-center text-vault-muted">Upload the first owner photo</div>
            )}
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto">
            {item.photos.map((photo, index) => (
              <button key={photo.id} onClick={() => setActivePhoto(index)} className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-md border ${activePhoto === index ? "border-vault-gold" : "border-vault-border"}`}>
                <AssetImage src={photo.url} alt="" sizes="80px" />
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ProofUpload
              icon={ImagePlus}
              label="Add more photos"
              detail="Owner photos, serial shots, condition angles."
              accept="image/jpeg,image/png,image/webp"
              onUpload={async (files) => {
                await addProofFiles(item.id, files.slice(0, 6), []);
                setProofToast(`${files.length} photo${files.length === 1 ? "" : "s"} added.`);
              }}
            />
            <button
              onClick={async () => {
                const photo = item.photos[activePhoto];
                if (!photo) return;
                await removePhoto(item.id, photo.id);
                setActivePhoto(0);
                setProofToast("Photo removed from this asset file.");
              }}
              disabled={!item.photos.length}
              className="rounded-md border border-vault-border bg-vault-surface p-4 text-left transition hover:border-vault-red disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={18} className="text-vault-red" />
              <span className="mt-3 block text-sm font-semibold text-vault-text">Remove selected photo</span>
              <span className="mt-1 block text-xs leading-5 text-vault-muted">Removes the active image from the gallery.</span>
            </button>
          </div>
        </div>

        <div className="vault-panel rounded-lg p-6">
          <p className="section-label">Position Detail</p>
          <h1 className="mt-3 font-serif text-6xl font-light leading-none text-vault-text">{item.name}</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge>{categoryLabel(item.category)}</Badge>
            <Badge tone={daily.amount >= 0 ? "green" : "red"}>{daily.amount >= 0 ? "Up today" : "Down today"}</Badge>
            {item.editionTotal ? <Badge tone="purple">#{item.editionNumber}/{item.editionTotal}</Badge> : null}
          </div>

          <div className="mt-8 border-y border-vault-border py-6">
            <p className="section-label">Current Estimated Value</p>
            <p className="data mt-2 text-5xl text-vault-text">{currency.format(item.currentValueUser)}</p>
            <p className={`data mt-2 text-sm ${daily.amount >= 0 ? "text-vault-green" : "text-vault-red"}`}>
              {daily.amount >= 0 ? "▲" : "▼"} {preciseCurrency.format(daily.amount)} ({percent.format(daily.percentage)}) Today
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Stat label="Cost Basis" value={currency.format(item.costBasis)} />
            <Stat label="Total Return" value={`${preciseCurrency.format(itemReturn.amount)} (${percent.format(itemReturn.percentage)})`} tone={itemReturn.amount >= 0 ? "green" : "red"} />
            <Stat label="52-Week High" value={currency.format(highLow.high)} />
            <Stat label="52-Week Low" value={currency.format(highLow.low)} />
            <Stat label="Market Liquidity" value={getLiquidity(item)} compact />
            <Stat label="Last Sale" value={`${currency.format(item.lastSalePrice ?? item.currentValueUser)}${item.lastSaleDate ? ` · ${new Date(item.lastSaleDate).toLocaleDateString()}` : ""}`} compact />
          </div>

          <MarketValuationPanel item={item} />

          <div className="mt-6 rounded-md border border-vault-border bg-vault-surface p-4">
            <p className="section-label">Manual Override</p>
            <div className="mt-3 flex gap-3">
              <input value={estimate} onChange={(event) => setEstimate(event.target.value)} className="form-input data" />
              <button onClick={() => updateEstimate(item.id, Number(estimate))} className="rounded-md bg-vault-gold px-4 font-semibold text-vault-black"><Pencil size={16} /></button>
            </div>
            <p className="mt-3 text-xs text-vault-muted">{item.currentValueSource} · updated {new Date(item.currentValueUpdatedAt).toLocaleString()}</p>
          </div>

          <div className="mt-4">
            <OpenToOffersControl item={item} />
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="vault-panel rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="section-label">Price History</p>
              <h2 className="mt-2 font-serif text-4xl font-light text-vault-text">Unrealized gain above cost basis.</h2>
            </div>
            <div className="hidden rounded border border-vault-border bg-vault-black p-1 sm:flex">
              {["1M", "3M", "1Y", "ALL"].map((range) => <span key={range} className="rounded px-3 py-2 font-mono text-[11px] text-vault-muted first:bg-vault-gold first:text-vault-black">{range}</span>)}
            </div>
          </div>
          <div className="mt-5 h-72 rounded-md border border-vault-border bg-vault-black p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 4, left: 0 }}>
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#3e3c38", fontSize: 11, fontFamily: "DM Mono" }} />
                <YAxis hide domain={["dataMin - 2000", "dataMax + 2000"]} />
                <Tooltip
                  cursor={{ stroke: "#2a2a3a" }}
                  contentStyle={{ background: "#111118", border: "1px solid #2a2a3a", borderRadius: 8, color: "#f0ece8" }}
                  formatter={(value: number, name: string) => [currency.format(value), name === "value" ? "Market value" : "Cost basis"]}
                />
                <ReferenceLine y={item.costBasis} stroke="#4a3d1a" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="value" stroke="#c9a84c" strokeWidth={3} dot={false} isAnimationActive animationDuration={1000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">Share Card Generator</p>
          <div className="mt-4 aspect-square rounded-lg border border-vault-border bg-vault-black p-4">
            <div className="relative h-40 overflow-hidden rounded-md">
              {item.photos[0]?.url ? <AssetImage src={item.photos[0].url} alt="" sizes="300px" /> : null}
            </div>
            <p className="mt-4 font-serif text-3xl font-light text-vault-text">{item.name}</p>
            <p className="data mt-2 text-vault-gold">{currency.format(item.costBasis)} to {currency.format(item.currentValueUser)}</p>
            <p className="data mt-1 text-vault-green">{percent.format(itemReturn.percentage)} return</p>
          </div>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-md border border-vault-border px-4 py-3 text-vault-text transition hover:border-vault-bright">
            <Share2 size={16} />
            Download PNG Stub
          </button>
          <p className="mt-2 text-xs text-vault-faint">{shareText}</p>
        </div>
      </section>

      <section className="mt-6 vault-panel rounded-lg p-5">
        <p className="section-label">Market Comps</p>
        <div className="mt-5 grid gap-3 md:grid-cols-5">
          {comps.map((comp) => (
            <div key={comp.id} className="rounded-md border border-vault-border bg-vault-surface p-4">
              <p className="line-clamp-2 min-h-10 text-sm font-medium text-vault-text">{comp.title}</p>
              <p className="data mt-3 text-xl text-vault-gold">{currency.format(comp.price)}</p>
              <p className="mt-2 text-xs text-vault-muted">{new Date(comp.soldAt).toLocaleDateString("en-US")} · {comp.source}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-vault-faint">{comp.confidence} confidence</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">Editable Asset Record</p>
          <h2 className="mt-2 font-serif text-4xl font-light text-vault-text">Keep the economics and provenance current.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <EditField label="Name" value={editForm.name} onChange={(value) => setEditForm({ ...editForm, name: value })} />
            <EditField label="Brand / Maker" value={editForm.brand} onChange={(value) => setEditForm({ ...editForm, brand: value })} />
            <EditField label="Reference / Serial" value={editForm.referenceNumber} onChange={(value) => setEditForm({ ...editForm, referenceNumber: value })} />
            <EditField label="Condition / Grade" value={editForm.condition} onChange={(value) => setEditForm({ ...editForm, condition: value })} />
            <EditField label="Cost Basis" value={editForm.costBasis} onChange={(value) => setEditForm({ ...editForm, costBasis: value })} data />
            <EditField label="Current Estimate" value={editForm.currentValueUser} onChange={(value) => setEditForm({ ...editForm, currentValueUser: value })} data />
            <EditField label="Date Acquired" value={editForm.acquiredDate} onChange={(value) => setEditForm({ ...editForm, acquiredDate: value })} type="date" data />
            <EditField label="Acquired From" value={editForm.acquiredFrom} onChange={(value) => setEditForm({ ...editForm, acquiredFrom: value })} />
          </div>
          <label className="mt-3 block">
            <span className="mb-2 block section-label">Notes</span>
            <textarea className="form-input min-h-24" value={editForm.notes} onChange={(event) => setEditForm({ ...editForm, notes: event.target.value })} />
          </label>
          <label className="mt-3 block">
            <span className="mb-2 block section-label">Story</span>
            <textarea className="form-input min-h-28" value={editForm.story} onChange={(event) => setEditForm({ ...editForm, story: event.target.value })} />
          </label>
          <button
            onClick={async () => {
              await updateItemDetails(item.id, {
                name: editForm.name,
                brand: editForm.brand,
                referenceNumber: editForm.referenceNumber || undefined,
                condition: editForm.condition,
                costBasis: Number(editForm.costBasis || 0),
                currentValueUser: Number(editForm.currentValueUser || 0),
                acquiredDate: editForm.acquiredDate,
                acquiredFrom: editForm.acquiredFrom || undefined,
                notes: editForm.notes,
                story: editForm.story
              });
              setEstimate(editForm.currentValueUser);
              setProofToast("Asset record saved.");
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-vault-gold px-4 py-3 font-semibold text-vault-black transition hover:bg-vault-gold-light"
          >
            <Save size={16} />
            Save Asset Record
          </button>
        </div>

        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">Story</p>
          <p className="mt-4 text-sm leading-7 text-vault-muted">{item.story}</p>
        </div>
        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">Provenance Vault</p>
          <h2 className="mt-2 font-serif text-4xl font-light text-vault-text">Receipts, certificates, and owner proof.</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ProofUpload
              icon={ImagePlus}
              label="Add owner photos"
              detail="Show the actual physical item in your possession."
              accept="image/*"
              onUpload={async (files) => {
                await addProofFiles(item.id, files.slice(0, 6), []);
                setProofToast(`${files.length} photo${files.length === 1 ? "" : "s"} added to provenance.`);
              }}
            />
            <ProofUpload
              icon={FileUp}
              label="Add documents"
              detail="Receipts, certificates, appraisals, service records."
              accept="image/*,.pdf"
              onUpload={async (files) => {
                await addProofFiles(item.id, [], files.map((file) => ({ file, type: "other" as const })));
                setProofToast(`${files.length} document${files.length === 1 ? "" : "s"} added to provenance.`);
              }}
            />
          </div>
          {proofToast ? <p className="mt-3 text-xs text-vault-gold">{proofToast}</p> : null}
          <div className="mt-5 space-y-3">
            {item.documents.map((document) => (
              <a key={document.id} href={document.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-vault-border bg-vault-surface p-4 transition hover:border-vault-bright">
                <span className="flex items-center gap-3 text-sm text-vault-text"><FileText size={16} className="text-vault-gold" />{document.filename}</span>
                <Download size={15} className="text-vault-muted" />
              </a>
            ))}
            {!item.documents.length ? <p className="rounded-md border border-dashed border-vault-border p-4 text-sm leading-6 text-vault-muted">Add purchase proof or authenticity documents to make this asset file resale-ready.</p> : null}
          </div>
        </div>
      </section>
    </AppShell>
  );
}

function EditField({ label, value, onChange, type = "text", data = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; data?: boolean }) {
  return (
    <label>
      <span className="mb-2 block section-label">{label}</span>
      <input className={`form-input ${data ? "data" : ""}`} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function ProofUpload({ icon: Icon, label, detail, accept, onUpload }: { icon: typeof FileUp; label: string; detail: string; accept: string; onUpload: (files: File[]) => Promise<void> }) {
  const [uploading, setUploading] = useState(false);
  return (
    <label className="block cursor-pointer rounded-md border border-vault-border bg-vault-surface p-4 transition hover:border-vault-bright">
      <Icon size={18} className="text-vault-gold" />
      <span className="mt-3 block text-sm font-semibold text-vault-text">{uploading ? "Uploading..." : label}</span>
      <span className="mt-1 block text-xs leading-5 text-vault-muted">{detail}</span>
      <input
        className="sr-only"
        type="file"
        accept={accept}
        multiple
        disabled={uploading}
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []);
          if (!files.length) return;
          setUploading(true);
          try {
            await onUpload(files);
          } finally {
            setUploading(false);
          }
        }}
      />
    </label>
  );
}

function Stat({ label, value, tone = "text", compact = false }: { label: string; value: string; tone?: "text" | "green" | "red"; compact?: boolean }) {
  const color = tone === "green" ? "text-vault-green" : tone === "red" ? "text-vault-red" : "text-vault-text";
  return (
    <div className="rounded-md border border-vault-border bg-vault-surface p-4">
      <p className="section-label">{label}</p>
      <p className={`data mt-2 ${compact ? "text-[13px] leading-5" : "text-xl"} ${color}`}>{value}</p>
    </div>
  );
}

function MarketValuationPanel({ item }: { item: VaultItem }) {
  const confidence = item.priceConfidence ?? (item.currentValueMarket ? "MEDIUM" : "NONE");
  const hasPrice = confidence !== "NONE" && Boolean(item.currentValueMarket ?? item.currentValueUser);
  const dot = confidence === "HIGH" ? "bg-vault-green" : confidence === "MEDIUM" ? "bg-vault-gold" : confidence === "LOW" ? "bg-vault-red" : "bg-vault-faint";

  return (
    <div className="mt-6 rounded-[10px] border border-vault-border bg-vault-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="section-label">Market Valuation</p>
          <p className="data mt-3 text-4xl text-vault-gold">{hasPrice ? currency.format(item.currentValueMarket ?? item.currentValueUser) : "—"}</p>
          <p className="mt-2 text-xs text-vault-muted">{hasPrice ? `Median of ${item.priceSampleSize ?? item.salesLast30Days ?? 0} recent sales` : "No recent sales data"}</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded border border-vault-border bg-vault-black px-3 py-2 font-mono text-[11px] text-vault-muted"><span className={`h-2 w-2 rounded-full ${dot}`} />{confidence}</span>
      </div>
      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
        <div><p className="section-label">Range</p><p className="data mt-1 text-vault-text">{item.priceLow && item.priceHigh ? `${currency.format(item.priceLow)} to ${currency.format(item.priceHigh)}` : "—"}</p></div>
        <div><p className="section-label">Last Sale</p><p className="data mt-1 text-vault-text">{item.lastSalePrice ? currency.format(item.lastSalePrice) : "—"}{item.lastSaleDate ? <span className="block text-[10px] text-vault-faint">{new Date(item.lastSaleDate).toLocaleDateString()}</span> : null}</p></div>
        <div><p className="section-label">Source</p><p className="mt-1 text-xs text-vault-muted">{item.ebaySearchQuery ? "eBay Sold Listings" : "Your estimate"}{item.ebaySearchQuery ? <span className="block text-vault-faint">{item.ebaySearchQuery}</span> : null}</p></div>
      </div>
    </div>
  );
}

function buildMarketComps(item: VaultItem): MarketComp[] {
  const base = item.marketComps.length ? item.marketComps : [];
  const lastSaleDate = item.lastSaleDate ?? item.currentValueUpdatedAt;
  const synthetic: MarketComp[] = Array.from({ length: 5 }, (_, index) => ({
    id: `${item.id}-demo-comp-${index + 1}`,
    source: index % 2 === 0 ? "Demo sold comp" : item.currentValueSource,
    title: `${item.condition} comparable sale ${index + 1}`,
    price: Math.round((item.lastSalePrice ?? item.currentValueUser) * (1 - index * 0.012)),
    soldAt: new Date(new Date(lastSaleDate).getTime() - index * 7 * 24 * 60 * 60 * 1000).toISOString(),
    confidence: index < 2 ? "High" : "Medium"
  }));

  return [...base, ...synthetic].slice(0, 5);
}
