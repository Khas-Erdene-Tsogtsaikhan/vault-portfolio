"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/Badge";
import { AssetImage } from "@/components/AssetImage";
import { OpenToOffersControl } from "@/components/OpenToOffersControl";
import { categories, type Category } from "@/lib/types";
import { categoryLabel, currency, getCompletenessScore, getItemDailyDelta, getItemReturn, percent, preciseCurrency } from "@/lib/portfolio-utils";
import { useVaultStore } from "@/lib/vault-store";

type SortKey = "value" | "return" | "delta" | "acquired" | "documents";

export function CollectionTable() {
  const items = useVaultStore((state) => state.items);
  const lastAdded = useVaultStore((state) => state.lastAddedItemId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const [sort, setSort] = useState<SortKey>("value");

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

      <div className="vault-table">
        <div className="hidden grid-cols-[1.3fr_0.75fr_0.72fr_0.75fr_0.7fr_0.85fr] border-b border-vault-border px-4 py-3 text-[9px] uppercase tracking-[0.15em] text-vault-faint lg:grid">
          <span>Asset</span><span>Category</span><span>Value</span><span>Today</span><span>Docs</span><span>Liquidity</span>
        </div>
        {rows.map((item) => {
          const itemReturn = getItemReturn(item);
          const daily = getItemDailyDelta(item);
          return (
            <motion.div
              key={item.id}
              initial={item.id === lastAdded ? { opacity: 0, y: -18 } : false}
              animate={{ opacity: 1, y: 0 }}
              className="grid gap-4 border-b border-vault-border bg-vault-card px-4 py-3.5 transition last:border-b-0 hover:bg-vault-gold/5 lg:grid-cols-[1.3fr_0.75fr_0.72fr_0.75fr_0.7fr_0.85fr] lg:items-center"
            >
              <Link href={`/collection/${item.id}`} className="flex items-center gap-4">
                <div className="relative h-10 w-10 overflow-hidden rounded-md border border-vault-border">
                  <AssetImage src={item.photos[0]?.url} alt={item.name} sizes="64px" />
                </div>
                <span>
                  <span className="block text-[13px] font-medium text-vault-text">{item.name}</span>
                  <span className="mt-0.5 block text-[11px] text-vault-faint">{item.brand} · {item.referenceNumber ?? "No ref"}</span>
                </span>
              </Link>
              <span><Badge tone="muted">{categoryLabel(item.category)}</Badge></span>
              <span>
                <span className="data block text-[13px] text-vault-text">{currency.format(item.currentValueUser)}</span>
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
              <OpenToOffersControl item={item} compact />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
