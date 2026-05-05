"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Barcode, Camera, CheckCircle2, FileUp, Link as LinkIcon, Sparkles } from "lucide-react";
import { MarketLookup } from "@/components/MarketLookup";
import { categories, type Category, type VaultDocument } from "@/lib/types";
import type { MarketSearchResult } from "@/lib/types";
import { categoryLabel, currency, getCrossedMilestone, getPortfolioMetrics, getTier } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

export function AddItemWizard() {
  const router = useRouter();
  const addItem = useVaultStore((state) => state.addItem);
  const items = useVaultStore((state) => state.items);
  const itemCount = items.length;
  const [method, setMethod] = useState<"manual" | "photo" | "barcode" | "url">("manual");
  const [toast, setToast] = useState("");
  const [tierCelebration, setTierCelebration] = useState("");
  const [form, setForm] = useState({
    category: "watches" as Category,
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
    story: "",
    url: ""
  });
  const [photoFiles, setPhotoFiles] = useState<string[]>([]);
  const [documentFiles, setDocumentFiles] = useState<Array<{ filename: string; type: VaultDocument["type"] }>>([]);
  const [marketResult, setMarketResult] = useState<MarketSearchResult | null>(null);

  function applyMarketResult(result: MarketSearchResult) {
    setMarketResult(result);
    setForm((current) => ({
      ...current,
      category: result.category,
      name: result.title,
      brand: result.title.split(" ")[0] || current.brand,
      condition: result.condition ?? current.condition,
      currentValueUser: String(result.price),
      url: result.url ?? current.url
    }));
    setPhotoFiles(result.imageUrl ? [result.imageUrl] : []);
    setToast(`${result.title} priced at ${currency.format(result.price)} from ${result.source}. Review, add cost basis, then place it in your Vault.`);
  }

  function prefillFromPhoto() {
    setMethod("photo");
    setForm((current) => ({ ...current, name: "Scanned Object Draft", brand: "OCR pending", referenceNumber: "REF-READ" }));
    setToast("Photo scan mocked: VAULT extracted a draft name, brand, and reference for confirmation.");
  }

  function prefillFromBarcode() {
    setMethod("barcode");
    setForm((current) => ({ ...current, category: "books", name: "ISBN Product Draft", brand: "Open Library placeholder", referenceNumber: "978-0-000000-0-0" }));
    setToast("Barcode layer mocked: product metadata is staged for user confirmation.");
  }

  function prefillFromUrl() {
    setMethod("url");
    setForm((current) => ({ ...current, name: "Imported Listing Draft", brand: "Source placeholder", currentValueUser: "2400" }));
    setToast("URL import mocked: listing extraction is represented for faster item entry.");
  }

  function submit() {
    const beforeMetrics = getPortfolioMetrics(items);
    const item = addItem({
      name: form.name || "Untitled Vault Asset",
      category: form.category,
      brand: form.brand || "Unknown maker",
      referenceNumber: form.referenceNumber || undefined,
      editionNumber: form.editionNumber ? Number(form.editionNumber) : undefined,
      editionTotal: form.editionTotal ? Number(form.editionTotal) : undefined,
      condition: form.condition,
      costBasis: Number(form.costBasis || 0),
      currentValueUser: Number(form.currentValueUser || form.costBasis || 0),
      currentValueMarket: marketResult?.priceConfidence === "NONE" ? undefined : marketResult?.price,
      ebaySearchQuery: marketResult?.searchQuery,
      ebayReference: marketResult?.id,
      priceLow: marketResult?.priceLow,
      priceHigh: marketResult?.priceHigh,
      lastSalePrice: marketResult?.lastSalePrice,
      lastSaleDate: marketResult?.lastSaleDate,
      priceSampleSize: marketResult?.soldCount,
      priceConfidence: marketResult?.priceConfidence,
      acquiredDate: form.acquiredDate,
      acquiredFrom: form.acquiredFrom,
      notes: form.notes,
      story: form.story || "The provenance story begins here.",
      photoFiles,
      documentFiles
    });
    const nextTotal = beforeMetrics.totalValue + item.currentValueUser;
    const nextTier = getTier(nextTotal);
    const milestone = getCrossedMilestone(nextTotal);
    setToast(`${item.name} is now in your Vault. Your collection has ${itemCount + 1} items.${milestone ? ` You crossed ${milestone.label} in catalogued value.` : ""}`);
    if (nextTier !== beforeMetrics.tier) {
      setTierCelebration(nextTier);
      setTimeout(() => router.push("/"), 1600);
    } else {
      setTimeout(() => router.push("/"), 900);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="vault-panel rounded-lg p-5">
        <p className="section-label">Add to Legacy</p>
        <h1 className="mt-2 font-serif text-5xl font-light text-vault-text">Adding should feel like accessioning a masterpiece.</h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <MethodButton active={method === "manual"} icon={Sparkles} label="Manual" onClick={() => setMethod("manual")} />
          <MethodButton active={method === "photo"} icon={Camera} label="Photo Scan" onClick={prefillFromPhoto} />
          <MethodButton active={method === "barcode"} icon={Barcode} label="Barcode" onClick={prefillFromBarcode} />
          <MethodButton active={method === "url"} icon={LinkIcon} label="URL Import" onClick={prefillFromUrl} />
        </div>

        <div className="mt-6 rounded-[10px] border border-vault-border bg-vault-black p-4">
          <p className="section-label">Search Worth First</p>
          <p className="mt-2 text-sm text-vault-muted">Search market comps before typing. VAULT will prefill the estimate when you choose a result.</p>
          <div className="mt-4">
            <MarketLookup onSelect={applyMarketResult} compact />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Field label="Category"><select className="form-input" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as Category })}>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category)}</option>)}</select></Field>
          <Field label="Item Name"><input className="form-input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Patek Nautilus, first edition book..." /></Field>
          <Field label="Brand / Maker"><input className="form-input" value={form.brand} onChange={(event) => setForm({ ...form, brand: event.target.value })} placeholder="Rolex, Nike, Mira Kline" /></Field>
          <Field label="Reference / Serial"><input className="form-input" value={form.referenceNumber} onChange={(event) => setForm({ ...form, referenceNumber: event.target.value })} placeholder="5711/1A, PSA serial, ISBN" /></Field>
          <Field label="Edition Number"><input className="form-input" value={form.editionNumber} onChange={(event) => setForm({ ...form, editionNumber: event.target.value })} placeholder="12" /></Field>
          <Field label="Edition Total"><input className="form-input" value={form.editionTotal} onChange={(event) => setForm({ ...form, editionTotal: event.target.value })} placeholder="100" /></Field>
          <Field label="What You Paid"><input className="form-input data" value={form.costBasis} onChange={(event) => setForm({ ...form, costBasis: event.target.value })} placeholder="12500" /></Field>
          <Field label="Your Current Estimate"><input className="form-input data" value={form.currentValueUser} onChange={(event) => setForm({ ...form, currentValueUser: event.target.value })} placeholder="42000" /></Field>
          <Field label="Date Acquired"><input className="form-input data" type="date" value={form.acquiredDate} onChange={(event) => setForm({ ...form, acquiredDate: event.target.value })} /></Field>
          <Field label="Condition"><input className="form-input" value={form.condition} onChange={(event) => setForm({ ...form, condition: event.target.value })} /></Field>
          <Field label="Acquired From"><input className="form-input" value={form.acquiredFrom} onChange={(event) => setForm({ ...form, acquiredFrom: event.target.value })} placeholder="Gallery, dealer, auction, private" /></Field>
          <Field label="URL Import Source"><input className="form-input" value={form.url} onChange={(event) => setForm({ ...form, url: event.target.value })} placeholder="Paste listing URL for future import layer" /></Field>
          <Field label="Notes / Provenance / Condition"><textarea className="form-input min-h-28" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field>
          <Field label="Story"><textarea className="form-input min-h-28" value={form.story} onChange={(event) => setForm({ ...form, story: event.target.value })} placeholder="How this piece entered your life and why it matters." /></Field>
        </div>
      </section>

      <aside className="space-y-5">
        <UploadBox label="Photos" detail="Up to 6 photos. Camera capture works on mobile." accept="image/*" multiple onChange={(names) => setPhotoFiles(names.slice(0, 6))} />
        <UploadBox label="Documents" detail="Receipts, certificates, appraisals, service records." accept="image/*,.pdf" multiple onChange={(names) => setDocumentFiles(names.map((filename) => ({ filename, type: "other" as const })))} />
        <div className="vault-panel rounded-lg p-5">
          <p className="section-label">Immediate Weight</p>
          <p className="data mt-3 text-4xl text-vault-gold">{currency.format(Number(form.currentValueUser || form.costBasis || 0))}</p>
          <p className="mt-3 text-sm leading-6 text-vault-muted">This is the number that will lift your portfolio total when the asset enters VAULT.</p>
        </div>
        <button onClick={submit} className="flex w-full items-center justify-center gap-2 rounded-md bg-vault-gold px-5 py-4 font-semibold text-vault-black transition hover:bg-vault-gold-light">
          <CheckCircle2 size={18} />
          Place in Vault
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

function UploadBox({ label, detail, accept, multiple, onChange }: { label: string; detail: string; accept: string; multiple: boolean; onChange: (names: string[]) => void }) {
  return (
    <label className="vault-panel block cursor-pointer rounded-lg p-5">
      <FileUp className="text-vault-gold" />
      <span className="mt-3 block font-semibold text-vault-text">{label}</span>
      <span className="mt-2 block text-sm leading-6 text-vault-muted">{detail}</span>
      <input className="sr-only" type="file" accept={accept} multiple={multiple} capture={accept === "image/*" ? "environment" : undefined} onChange={(event) => onChange(Array.from(event.target.files ?? []).map((file) => file.name))} />
    </label>
  );
}
