"use client";

import Image from "next/image";
import { Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/Badge";
import { categoryLabel, currency } from "@/lib/portfolio-utils";
import type { MarketSearchResult } from "@/lib/types";

type PublicValuation = {
  marketValue: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  sampleSize: number;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  suspicious?: boolean;
};

export function MarketLookup({ onSelect, compact = false, selectedIds = [], actionLabel = "Use" }: { onSelect?: (result: MarketSearchResult) => void; compact?: boolean; selectedIds?: string[]; actionLabel?: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MarketSearchResult[]>([]);
  const [source, setSource] = useState("");
  const [valuation, setValuation] = useState<PublicValuation | null>(null);
  const [loading, setLoading] = useState(false);
  const [pickingId, setPickingId] = useState<string | null>(null);

  async function searchFor(value = query) {
    if (!value.trim()) return;
    setQuery(value);
    setLoading(true);
    const response = await fetch(`/api/market/search?q=${encodeURIComponent(value)}&limit=5`);
    const data = await response.json() as { results: MarketSearchResult[]; source: string; valuation?: PublicValuation };
    setResults(data.results);
    setSource(data.source);
    setValuation(data.valuation ?? null);
    setLoading(false);
  }

  async function pickResult(result: MarketSearchResult) {
    if (!onSelect) return;
    if (result.priceOptions?.length || !result.pricechartingId) {
      onSelect(result);
      return;
    }
    setPickingId(result.id);
    try {
      const response = await fetch(`/api/market/product?id=${encodeURIComponent(result.pricechartingId)}&q=${encodeURIComponent(query || result.title)}`);
      const data = await response.json() as { results: MarketSearchResult[] };
      onSelect(data.results[0] ?? result);
    } finally {
      setPickingId(null);
    }
  }

  return (
    <section className={compact ? "" : "vault-panel rounded-lg p-5"}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-faint" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchFor(); }} className="form-input pl-10" placeholder="Search PriceCharting: Charizard #4 PSA 10, EarthBound SNES, Mario N64..." />
        </label>
        <button onClick={() => searchFor()} className="rounded bg-vault-gold px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-vault-black transition hover:bg-vault-gold-light">
          {loading ? "Searching" : "Search Guide Value"}
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {["Charizard #4 PSA 10", "EarthBound Super Nintendo", "Amazing Spider-Man 300 CGC 9.8"].map((example) => (
          <button key={example} onClick={() => searchFor(example)} className="rounded border border-vault-border bg-vault-black px-3 py-1.5 text-[11px] text-vault-muted transition hover:border-vault-bright hover:text-vault-text">
            {example}
          </button>
        ))}
      </div>
      {source ? <p className="mt-3 text-xs text-vault-faint">Source: {sourceLabel(source)} · search is one queued call; exact guide value loads when you pick an item.</p> : null}

      {valuation?.marketValue ? (
        <div className="mt-4 rounded-[10px] border border-vault-border bg-vault-black p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-label">Market Valuation</p>
              <p className="data mt-2 text-3xl text-vault-gold">{currency.format(valuation.marketValue)}</p>
            </div>
            <Confidence confidence={valuation.confidence} />
          </div>
          <p className="mt-3 text-xs text-vault-muted">
            {valuation.confidence === "NONE" ? "No PriceCharting guide value found." : `Guide value from ${valuation.sampleSize} yearly sales signal${valuation.sampleSize === 1 ? "" : "s"} · Available condition range ${currency.format(valuation.priceLow ?? 0)} to ${currency.format(valuation.priceHigh ?? 0)} · Synced ${valuation.lastSaleDate ? new Date(valuation.lastSaleDate).toLocaleDateString() : "today"}`}
          </p>
        </div>
      ) : null}

      {results.length ? (
        <div className="mt-5 grid gap-3">
          {results.map((result) => (
            <article key={result.id} className="grid gap-4 rounded-[10px] border border-vault-border bg-vault-surface p-4 transition hover:-translate-y-0.5 hover:border-vault-bright sm:grid-cols-[64px_1fr_auto] sm:items-center">
              <div className="relative h-16 w-16 overflow-hidden rounded-md border border-vault-border bg-vault-black">
                {result.imageUrl ? <SearchResultImage src={result.imageUrl} alt="" /> : <TrendingUp className="m-5 text-vault-gold" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium text-vault-text">{result.title}</h3>
                  <Badge tone="muted">{categoryLabel(result.category)}</Badge>
                </div>
                <p className="mt-2 text-xs text-vault-muted">{result.condition ?? "Guide value"} · {result.pricechartingConsole ?? "PriceCharting"} · {result.priceConfidence ?? result.confidence} confidence · {result.soldCount ?? 0} yearly sales signal</p>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <span className="data text-xl text-vault-gold">{result.price > 0 ? currency.format(result.price) : "Select"}</span>
                {onSelect ? (
                  <button
                    onClick={() => void pickResult(result)}
                    disabled={pickingId === result.id}
                    className={`rounded border px-3 py-2 text-xs transition ${selectedIds.includes(result.id) ? "border-vault-gold bg-vault-gold/10 text-vault-gold" : "border-vault-border text-vault-text hover:border-vault-bright"}`}
                  >
                    {pickingId === result.id ? "Loading value" : selectedIds.includes(result.id) ? "Picked" : actionLabel}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function SearchResultImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <TrendingUp className="m-5 text-vault-gold" />;
  return <Image src={src} alt={alt} fill sizes="64px" className="object-cover" onError={() => setFailed(true)} />;
}

function Confidence({ confidence }: { confidence: PublicValuation["confidence"] }) {
  const tone = confidence === "HIGH" ? "bg-vault-green" : confidence === "MEDIUM" ? "bg-vault-gold" : confidence === "LOW" ? "bg-vault-red" : "bg-vault-faint";
  return <span className="inline-flex items-center gap-2 rounded border border-vault-border bg-vault-surface px-3 py-2 font-mono text-[11px] text-vault-muted"><span className={`h-2 w-2 rounded-full ${tone}`} />{confidence}</span>;
}

function sourceLabel(source: string) {
  if (source === "pricecharting_api") return "PriceCharting API";
  if (source === "pricecharting_cache") return "VAULT price cache";
  if (source === "mock") return "VAULT demo PriceCharting model";
  return "PriceCharting";
}
