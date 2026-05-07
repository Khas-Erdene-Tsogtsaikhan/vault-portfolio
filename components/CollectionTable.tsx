"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Save, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { AssetImage } from "@/components/AssetImage";
import { ShareCardTrigger } from "@/components/ShareCards";
import { categories, type Category } from "@/lib/types";
import { categoryLabel, currency, getCompletenessScore, getCurrentValue, getItemDailyDelta, getItemReturn, getPrimaryPhoto, percent, preciseCurrency } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

type SortKey = "value" | "return" | "delta" | "acquired" | "documents";

export function CollectionTable() {
  const items = useVaultStore((state) => state.items);
  const lastAdded = useVaultStore((state) => state.lastAddedItemId);
  const updateItemDetails = useVaultStore((state) => state.updateItemDetails);
  const removeItem = useVaultStore((state) => state.removeItem);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [sort, setSort] = useState<SortKey>("value");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkForm, setBulkForm] = useState({ condition: "", acquiredDate: "", currentValueUser: "" });
  const [bulkMessage, setBulkMessage] = useState("");

  const rows = useMemo(() => {
    return items
      .filter((item) => `${item.name} ${item.brand} ${item.referenceNumber ?? ""}`.toLowerCase().includes(query.toLowerCase()))
      .filter((item) => category === "all" || item.category === category)
      .sort((a, b) => {
        if (sort === "return") return getItemReturn(b).percentage - getItemReturn(a).percentage;
        if (sort === "delta") return getItemDailyDelta(b).amount - getItemDailyDelta(a).amount;
        if (sort === "acquired") return b.acquiredDate.localeCompare(a.acquiredDate);
        if (sort === "documents") return b.documents.length - a.documents.length;
        return b.currentValueUser - a.currentValueUser;
      });
  }, [category, items, query, sort]);

  async function applyBulkEdit() {
    const patch = {
      ...(bulkForm.condition ? { condition: bulkForm.condition } : {}),
      ...(bulkForm.acquiredDate ? { acquiredDate: bulkForm.acquiredDate } : {}),
      ...(bulkForm.currentValueUser ? { currentValueUser: Number(bulkForm.currentValueUser) } : {})
    };
    if (!selectedIds.length || !Object.keys(patch).length) return;
    await Promise.all(selectedIds.map((id) => updateItemDetails(id, patch)));
    setBulkMessage(`${selectedIds.length} asset${selectedIds.length === 1 ? "" : "s"} updated.`);
    setSelectedIds([]);
    setBulkForm({ condition: "", acquiredDate: "", currentValueUser: "" });
  }

  async function removeSelected() {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(`Remove ${selectedIds.length} selected asset${selectedIds.length === 1 ? "" : "s"} from your Vault?`);
    if (!confirmed) return;
    await Promise.all(selectedIds.map((id) => removeItem(id)));
    setBulkMessage(`${selectedIds.length} asset${selectedIds.length === 1 ? "" : "s"} removed.`);
    setSelectedIds([]);
  }

  function toggleSelected(id: string, selected: boolean) {
    setSelectedIds((current) => selected ? Array.from(new Set([...current, id])) : current.filter((itemId) => itemId !== id));
    setBulkMessage("");
  }

  return (
    <div>
      <section className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 overflow-x-auto">
          <button onClick={() => setCategory("all")} className={`vault-pill ${category === "all" ? "vault-pill-active" : ""}`}>All</button>
          {categories.slice(0, 7).map((itemCategory) => (
            <button key={itemCategory} onClick={() => setCategory(itemCategory)} className={`vault-pill ${category === itemCategory ? "vault-pill-active" : ""}`}>{categoryLabel(itemCategory)}</button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[220px_180px]">
          <label className="relative">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-faint" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="form-input pl-10" placeholder="Search your vault" />
          </label>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="form-input">
            <option value="value">Sort by value</option>
            <option value="return">Sort by return</option>
            <option value="delta">Sort by daily delta</option>
            <option value="acquired">Sort by acquired date</option>
            <option value="documents">Sort by document count</option>
          </select>
        </div>
      </section>

      <section className="mb-4 flex flex-col gap-4 rounded-lg border border-vault-gold/25 bg-gradient-to-br from-[#141006] to-vault-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-label">Collection Wrapped</p>
          <p className="mt-1 text-sm text-vault-text">Export a beautiful portfolio card for your whole Vault.</p>
        </div>
        <ShareCardTrigger mode="collection" items={items} />
      </section>

      {selectedIds.length ? (
        <motion.section initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 rounded-lg border border-vault-gold/30 bg-vault-gold/10 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <p className="section-label">Bulk Asset Edit</p>
              <p className="mt-1 text-sm text-vault-text">{selectedIds.length} selected. Apply shared economics or condition metadata in one move.</p>
            </div>
            <input className="form-input lg:w-44" value={bulkForm.condition} onChange={(event) => setBulkForm({ ...bulkForm, condition: event.target.value })} placeholder="Condition / grade" />
            <input className="form-input data lg:w-44" type="date" value={bulkForm.acquiredDate} onChange={(event) => setBulkForm({ ...bulkForm, acquiredDate: event.target.value })} />
            <input className="form-input data lg:w-44" value={bulkForm.currentValueUser} onChange={(event) => setBulkForm({ ...bulkForm, currentValueUser: event.target.value })} placeholder="Current estimate" />
            <button onClick={applyBulkEdit} className="inline-flex items-center justify-center gap-2 rounded-md bg-vault-gold px-4 py-3 text-sm font-semibold text-vault-black">
              <Save size={15} />
              Apply
            </button>
            <button onClick={removeSelected} className="inline-flex items-center justify-center gap-2 rounded-md border border-vault-red/40 px-4 py-3 text-sm font-semibold text-vault-red transition hover:bg-vault-red/10">
              <Trash2 size={15} />
              Remove
            </button>
          </div>
        </motion.section>
      ) : bulkMessage ? (
        <p className="mb-4 rounded border border-vault-border bg-vault-surface p-3 text-xs text-vault-gold">{bulkMessage}</p>
      ) : null}

      <div className="vault-table">
        <div className="hidden grid-cols-[32px_1.3fr_0.75fr_0.72fr_0.75fr_0.7fr_0.85fr_42px] border-b border-vault-border px-4 py-3 text-[9px] uppercase tracking-[0.15em] text-vault-faint lg:grid">
          <button onClick={() => setSelectedIds(selectedIds.length === rows.length ? [] : rows.map((item) => item.id))} className="h-4 w-4 rounded border border-vault-border" aria-label="Select all visible assets" />
          <span>Asset</span><span>Category</span><span>Value</span><span>Today</span><span>Docs</span><span>Share</span><span />
        </div>
        {rows.map((item) => {
          const itemReturn = getItemReturn(item);
          const daily = getItemDailyDelta(item);
          const primaryPhoto = getPrimaryPhoto(item.photos);
          const selected = selectedIds.includes(item.id);
          return (
            <motion.div
              key={item.id}
              initial={item.id === lastAdded ? { opacity: 0, y: -18 } : false}
              animate={{ opacity: 1, y: 0 }}
              className={`grid gap-4 border-b border-vault-border bg-vault-card px-4 py-3.5 transition last:border-b-0 hover:bg-vault-gold/5 lg:grid-cols-[32px_1.3fr_0.75fr_0.72fr_0.75fr_0.7fr_0.85fr_42px] lg:items-center ${selected ? "bg-vault-gold/10" : ""}`}
            >
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(event) => toggleSelected(item.id, event.target.checked)}
                  className="h-4 w-4 accent-[#c9a84c]"
                  aria-label={`Select ${item.name}`}
                />
              </label>
              <Link href={`/collection/${item.id}`} className="flex items-center gap-4">
                <div className="relative h-10 w-10 overflow-hidden rounded-md border border-vault-border">
                  <AssetImage src={primaryPhoto?.url} alt={item.name} sizes="64px" />
                </div>
                <span>
                  <span className="block text-[13px] font-medium text-vault-text">{item.name}</span>
                  <span className="mt-0.5 block text-[11px] text-vault-faint">{item.brand} · {item.referenceNumber ?? "No ref"}</span>
                </span>
              </Link>
              <span><Badge tone="muted">{categoryLabel(item.category)}</Badge></span>
              <span>
                <span className="data block text-[13px] text-vault-text">{currency.format(getCurrentValue(item))}</span>
                <span className={`data mt-0.5 block text-[10px] ${itemReturn.amount >= 0 ? "text-vault-green" : "text-vault-red"}`}>{percent.format(itemReturn.percentage)} all-time</span>
              </span>
              <span className={`data ${daily.amount >= 0 ? "text-vault-green" : "text-vault-red"}`}>
                {preciseCurrency.format(daily.amount)}
                <span className="block text-[10px]">{percent.format(daily.percentage)} today</span>
              </span>
              <span className="flex items-center justify-between gap-2 text-xs text-vault-muted">
                {item.documents.length} docs · {getCompletenessScore(item)}%
                <ArrowUpRight size={15} />
              </span>
              <ShareCardTrigger mode="item" item={item} items={items} compact />
              <button
                onClick={async () => {
                  const confirmed = window.confirm(`Remove "${item.name}" from your Vault?`);
                  if (!confirmed) return;
                  await removeItem(item.id);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded border border-vault-border text-vault-muted transition hover:border-vault-red hover:text-vault-red"
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 size={15} />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
