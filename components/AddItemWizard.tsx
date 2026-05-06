"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Barcode, CheckCircle2, FileUp, Search, Sparkles, Trash2 } from "lucide-react";
import { MarketLookup } from "@/components/MarketLookup";
import { categories, type Category, type VaultDocument } from "@/lib/types";
import type { MarketSearchResult } from "@/lib/types";
import { categoryLabel, currency, getCrossedMilestone, getPortfolioMetrics, getTier } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

type AddMethod = "search" | "manual" | "barcode";
type PickedResult = {
  result: MarketSearchResult;
  costBasis: string;
  acquiredDate: string;
  condition: string;
  photoFiles: File[];
  documentFiles: Array<{ file: File; type: VaultDocument["type"] }>;
};

export function AddItemWizard() {
  const router = useRouter();
  const addItem = useVaultStore((state) => state.addItem);
  const items = useVaultStore((state) => state.items);
  const [method, setMethod] = useState<AddMethod>("search");
  const [toast, setToast] = useState("");
  const [tierCelebration, setTierCelebration] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [picked, setPicked] = useState<PickedResult[]>([]);
  const [manualPhotos, setManualPhotos] = useState<File[]>([]);
  const [manualDocuments, setManualDocuments] = useState<Array<{ file: File; type: VaultDocument["type"] }>>([]);
  const [form, setForm] = useState({
    category: "trading_cards" as Category,
    name: "",
    brand: "",
    referenceNumber: "",
    editionNumber: "",
    editionTotal: "",
    condition: "Excellent",
    costBasis: "",
    currentValueUser: "",
    acquiredDate: new Date().toISOString().slice(0, 10),
    acquiredFrom: "",
    notes: "",
    story: ""
  });

  function pickSearchResult(result: MarketSearchResult) {
    setPicked((current) => {
      if (current.some((item) => item.result.id === result.id)) return current;
      return [
        ...current,
        {
          result,
          costBasis: "",
          acquiredDate: new Date().toISOString().slice(0, 10),
          condition: result.condition ?? "Excellent",
          photoFiles: [],
          documentFiles: []
        }
      ];
    });
    setToast(`${result.title} added to your selection. Add cost basis, then place it in your Vault.`);
  }

  function removePicked(id: string) {
    setPicked((current) => current.filter((item) => item.result.id !== id));
  }

  function updatePicked(id: string, patch: Partial<PickedResult>) {
    setPicked((current) => current.map((item) => item.result.id === id ? { ...item, ...patch } : item));
  }

  function prefillFromBarcode() {
    setMethod("barcode");
    setForm((current) => ({
      ...current,
      category: "books",
      name: "Scanned ISBN Draft",
      brand: "Barcode lookup pending",
      referenceNumber: "978-0-000000-0-0",
      condition: "Scanned"
    }));
    setToast("Barcode is staged as a fast manual fallback. Real barcode product lookup can be wired after the core portfolio flow is stable.");
  }

  async function submit() {
    const beforeMetrics = getPortfolioMetrics(items);
    const selected = method === "search" ? picked : [];
    setIsSaving(true);

    try {
      const added = [];
      if (selected.length) {
        for (const pickedItem of selected) {
          const result = pickedItem.result;
          added.push(await addItem({
            name: result.title,
            category: result.category,
            brand: result.title.split(" ")[0] || "Unknown maker",
            referenceNumber: result.id,
            condition: pickedItem.condition,
            costBasis: Number(pickedItem.costBasis || 0),
            currentValueUser: result.price,
            currentValueMarket: result.priceConfidence === "NONE" ? undefined : result.price,
            ebaySearchQuery: result.searchQuery,
            ebayReference: result.id,
            priceLow: result.priceLow,
            priceHigh: result.priceHigh,
            lastSalePrice: result.lastSalePrice,
            lastSaleDate: result.lastSaleDate,
            priceSampleSize: result.soldCount,
            priceConfidence: result.priceConfidence,
            photoUrls: result.imageUrl ? [result.imageUrl] : undefined,
            acquiredDate: pickedItem.acquiredDate,
            notes: "Added from VAULT market search. Default image sourced from the matched market result; owner photos and proof can be added to the asset file over time.",
            story: "The provenance story begins here.",
            photoFiles: pickedItem.photoFiles,
            documentFiles: pickedItem.documentFiles
          }));
        }
      } else {
        added.push(await addItem({
          name: form.name || "Untitled Vault Asset",
          category: form.category,
          brand: form.brand || "Unknown maker",
          referenceNumber: form.referenceNumber || undefined,
          editionNumber: form.editionNumber ? Number(form.editionNumber) : undefined,
          editionTotal: form.editionTotal ? Number(form.editionTotal) : undefined,
          condition: form.condition,
          costBasis: Number(form.costBasis || 0),
          currentValueUser: Number(form.currentValueUser || form.costBasis || 0),
          acquiredDate: form.acquiredDate,
          acquiredFrom: form.acquiredFrom,
          notes: form.notes,
          story: form.story || "The provenance story begins here.",
          photoFiles: manualPhotos,
          documentFiles: manualDocuments
        }));
      }

      const addedValue = added.reduce((sum, item) => sum + (item.currentValueMarket ?? item.currentValueUser), 0);
      const nextTotal = beforeMetrics.totalValue + addedValue;
      const nextTier = getTier(nextTotal);
      const milestone = getCrossedMilestone(nextTotal);
      setToast(`${added.length} ${added.length === 1 ? "asset is" : "assets are"} now in your Vault.${milestone ? ` You crossed ${milestone.label} in catalogued value.` : ""}`);
      if (nextTier !== beforeMetrics.tier) {
        setTierCelebration(nextTier);
        setTimeout(() => router.push("/"), 1600);
      } else {
        setTimeout(() => router.push("/"), 900);
      }
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Could not save this item. Check Supabase setup and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const selectedValue = picked.reduce((sum, item) => sum + item.result.price, 0);
  const selectedCost = picked.reduce((sum, item) => sum + Number(item.costBasis || 0), 0);
  const manualValue = Number(form.currentValueUser || form.costBasis || 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
      <section className="vault-panel rounded-lg p-5">
        <p className="section-label">Add to Portfolio</p>
        <h1 className="mt-2 font-serif text-5xl font-light text-vault-text">Search, select, and add positions to your Vault.</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MethodButton active={method === "search"} icon={Search} label="Search" onClick={() => setMethod("search")} />
          <MethodButton active={method === "manual"} icon={Sparkles} label="Manual" onClick={() => setMethod("manual")} />
          <MethodButton active={method === "barcode"} icon={Barcode} label="Barcode" onClick={prefillFromBarcode} />
        </div>

        {method === "search" ? (
          <div className="mt-6 rounded-[10px] border border-vault-border bg-vault-black p-4">
            <p className="section-label">Search Worth First</p>
            <p className="mt-2 text-sm text-vault-muted">Search sold comps, pick more than one result, and review your selected positions in the tray before adding them.</p>
            <div className="mt-4">
              <MarketLookup onSelect={pickSearchResult} selectedIds={picked.map((item) => item.result.id)} actionLabel="Pick" compact />
            </div>
          </div>
        ) : (
          <ManualForm form={form} setForm={setForm} barcodeMode={method === "barcode"} />
        )}
      </section>

      <aside className="space-y-5">
        {method === "search" ? (
          <PickedTray picked={picked} selectedValue={selectedValue} selectedCost={selectedCost} onRemove={removePicked} onUpdate={updatePicked} />
        ) : (
          <>
        <UploadBox label="Photos" detail="Optional JPG, PNG, or WebP photos for this manual item." accept="image/jpeg,image/png,image/webp" multiple onChange={(files) => setManualPhotos(files.slice(0, 6))} />
            <UploadBox label="Documents" detail="Optional receipts, certificates, or records." accept="image/*,.pdf" multiple onChange={(files) => setManualDocuments(files.map((file) => ({ file, type: "other" as const })))} />
            <SummaryPanel value={manualValue} cost={Number(form.costBasis || 0)} count={1} />
          </>
        )}

        <button
          onClick={submit}
          disabled={isSaving || (method === "search" && picked.length === 0)}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-vault-gold px-5 py-4 font-semibold text-vault-black transition hover:bg-vault-gold-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCircle2 size={18} />
          {isSaving ? "Placing in Vault..." : method === "search" ? `Add ${picked.length || ""} Selected` : "Place in Vault"}
        </button>
      </aside>

      <AnimatePresence>
        {tierCelebration ? (
          <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-vault-black/90 p-6 backdrop-blur-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="max-w-xl rounded-[14px] border border-vault-gold-dim bg-gradient-to-br from-[#120e04] to-vault-card p-10 text-center" initial={{ scale: 0.9, y: 24 }} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 180, damping: 18 }}>
              <p className="hero-label justify-center before:hidden">Tier Upgrade</p>
              <h2 className="mt-4 font-serif text-6xl font-light text-vault-gold">{tierCelebration}</h2>
              <p className="mt-4 text-vault-muted">Your collection has crossed into a new class of physical wealth.</p>
            </motion.div>
          </motion.div>
        ) : null}
        {toast ? <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed bottom-6 right-6 z-50 max-w-sm rounded-lg border border-vault-gold/35 bg-vault-card p-4 text-sm leading-6 text-vault-text">{toast}</motion.div> : null}
      </AnimatePresence>
    </div>
  );
}

function ManualForm({ form, setForm, barcodeMode }: { form: Record<string, string | Category>; setForm: (form: any) => void; barcodeMode: boolean }) {
  return (
    <div className="mt-8">
      {barcodeMode ? (
        <div className="mb-6 rounded-[10px] border border-vault-gold/25 bg-vault-gold/10 p-4">
          <p className="section-label">Barcode Draft</p>
          <p className="mt-2 text-sm text-vault-muted">Barcode capture is represented as a prefilled manual draft for now. Confirm the fields, add value, then save.</p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category"><select className="form-input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Category })}>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></Field>
        <Field label="Item Name"><input className="form-input" value={String(form.name)} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Charizard PSA 10, Jordan 1..." /></Field>
        <Field label="Brand / Maker"><input className="form-input" value={String(form.brand)} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Pokemon, Nike, Topps" /></Field>
        <Field label="Reference / Serial"><input className="form-input" value={String(form.referenceNumber)} onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })} placeholder="PSA serial, SKU, ISBN" /></Field>
        <Field label="Edition Number"><input className="form-input" value={String(form.editionNumber)} onChange={(event) => setForm({ ...form, editionNumber: event.target.value })} placeholder="12" /></Field>
        <Field label="Edition Total"><input className="form-input" value={String(form.editionTotal)} onChange={(event) => setForm({ ...form, editionTotal: event.target.value })} placeholder="100" /></Field>
        <Field label="What You Paid"><input className="form-input data" value={String(form.costBasis)} onChange={(event) => setForm({ ...form, costBasis: event.target.value })} placeholder="4200" /></Field>
        <Field label="Current Estimate"><input className="form-input data" value={String(form.currentValueUser)} onChange={(event) => setForm({ ...form, currentValueUser: event.target.value })} placeholder="8200" /></Field>
        <Field label="Date Acquired"><input className="form-input data" type="date" value={String(form.acquiredDate)} onChange={(event) => setForm({ ...form, acquiredDate: event.target.value })} /></Field>
        <Field label="Condition"><input className="form-input" value={String(form.condition)} onChange={(event) => setForm({ ...form, condition: event.target.value })} /></Field>
        <Field label="Acquired From"><input className="form-input" value={String(form.acquiredFrom)} onChange={(event) => setForm({ ...form, acquiredFrom: event.target.value })} placeholder="Dealer, shop, auction, private" /></Field>
        <Field label="Notes / Provenance"><textarea className="form-input min-h-28" value={String(form.notes)} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
        <Field label="Story"><textarea className="form-input min-h-28" value={String(form.story)} onChange={(event) => setForm({ ...form, story: event.target.value })} placeholder="How this piece entered your collection." /></Field>
      </div>
    </div>
  );
}

function PickedTray({ picked, selectedValue, selectedCost, onRemove, onUpdate }: { picked: PickedResult[]; selectedValue: number; selectedCost: number; onRemove: (id: string) => void; onUpdate: (id: string, patch: Partial<PickedResult>) => void }) {
  return (
    <div className="vault-panel rounded-lg p-5">
      <p className="section-label">Selected Positions</p>
      <h2 className="mt-2 font-serif text-3xl font-light text-vault-text">{picked.length ? `${picked.length} ready for Vault` : "Pick items from search"}</h2>
      <div className="mt-4">
        <SummaryPanel value={selectedValue} cost={selectedCost} count={picked.length} />
      </div>
      <div className="mt-5 space-y-3">
        {picked.map((item) => (
          <article key={item.result.id} className="rounded-[10px] border border-vault-border bg-vault-black p-3">
            <div className="flex gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-vault-border bg-vault-surface">
                {item.result.imageUrl ? <Image src={item.result.imageUrl} alt="" fill sizes="56px" className="object-cover" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-vault-text">{item.result.title}</p>
                <p className="data mt-1 text-sm text-vault-gold">{currency.format(item.result.price)}</p>
              </div>
              <button onClick={() => onRemove(item.result.id)} className="self-start rounded border border-vault-border p-2 text-vault-muted transition hover:border-vault-red hover:text-vault-red" aria-label="Remove selected item">
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-3 grid gap-2">
              <input className="form-input data" value={item.costBasis} onChange={(event) => onUpdate(item.result.id, { costBasis: event.target.value })} placeholder="What you paid" />
              <input className="form-input data" type="date" value={item.acquiredDate} onChange={(event) => onUpdate(item.result.id, { acquiredDate: event.target.value })} />
              <input className="form-input" value={item.condition} onChange={(event) => onUpdate(item.result.id, { condition: event.target.value })} placeholder="Condition / grade" />
              <div className="grid gap-2 sm:grid-cols-2">
                <MiniUpload label="Owner photos" accept="image/jpeg,image/png,image/webp" onChange={(files) => onUpdate(item.result.id, { photoFiles: files.slice(0, 6) })} />
                <MiniUpload label="Proof docs" accept="image/*,.pdf" onChange={(files) => onUpdate(item.result.id, { documentFiles: files.map((file) => ({ file, type: "other" as const })) })} />
              </div>
              <p className="text-[11px] leading-5 text-vault-faint">Default photo comes from the market match. Upload your own photos, receipt, or certificate to strengthen provenance.</p>
            </div>
          </article>
        ))}
        {!picked.length ? <p className="rounded-[10px] border border-dashed border-vault-border p-4 text-sm leading-6 text-vault-muted">Search for real sold comps. Every result you pick appears here before it enters your portfolio.</p> : null}
      </div>
    </div>
  );
}

function MiniUpload({ label, accept, onChange }: { label: string; accept: string; onChange: (files: File[]) => void }) {
  const [count, setCount] = useState(0);
  return (
    <label className="cursor-pointer rounded-md border border-vault-border bg-vault-surface px-3 py-2 text-xs text-vault-muted transition hover:border-vault-bright hover:text-vault-text">
      <span>{count ? `${count} ${label}` : label}</span>
      <input
        className="sr-only"
        type="file"
        accept={accept}
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          setCount(files.length);
          onChange(files);
        }}
      />
    </label>
  );
}

function SummaryPanel({ value, cost, count }: { value: number; cost: number; count: number }) {
  const gain = value - cost;
  return (
    <div className="rounded-lg border border-vault-border bg-vault-black p-4">
      <p className="section-label">Immediate Portfolio Weight</p>
      <p className="data mt-3 text-4xl text-vault-gold">{currency.format(value)}</p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <span className="text-vault-muted">Positions <b className="data text-vault-text">{count}</b></span>
        <span className={gain >= 0 ? "text-vault-green" : "text-vault-red"}>{gain >= 0 ? "+" : ""}{currency.format(gain)}</span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block section-label">{label}</span>{children}</label>;
}

function MethodButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Sparkles; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`rounded-md border p-4 text-left transition ${active ? "border-vault-gold bg-vault-gold/10 text-vault-gold" : "border-vault-border bg-vault-surface text-vault-muted hover:border-vault-bright"}`}>
      <Icon size={18} />
      <span className="mt-3 block text-sm font-semibold">{label}</span>
    </button>
  );
}

function UploadBox({ label, detail, accept, multiple, onChange }: { label: string; detail: string; accept: string; multiple: boolean; onChange: (files: File[]) => void }) {
  return (
    <label className="vault-panel block cursor-pointer rounded-lg p-5">
      <FileUp className="text-vault-gold" />
      <span className="mt-3 block font-semibold text-vault-text">{label}</span>
      <span className="mt-2 block text-sm leading-6 text-vault-muted">{detail}</span>
      <input className="sr-only" type="file" accept={accept} multiple={multiple} capture={accept === "image/*" ? "environment" : undefined} onChange={(event) => onChange(Array.from(event.target.files ?? []))} />
    </label>
  );
}
