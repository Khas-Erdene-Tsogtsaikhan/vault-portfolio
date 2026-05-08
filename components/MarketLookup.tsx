"use client";

import { Search, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
};

export function MarketLookup({
  onSelect,
  compact = false,
  selectedIds = [],
  actionLabel = "Use"
}: {
  onSelect?: (result: MarketSearchResult) => void;
  compact?: boolean;
  selectedIds?: string[];
  actionLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MarketSearchResult[]>([]);
  const [source, setSource] = useState("");
  const [valuation, setValuation] = useState<PublicValuation | null>(null);
  const [status, setStatus] = useState<"idle" | "searching" | "pricing">("idle");
  const [pickingId, setPickingId] = useState<string | null>(null);
  const searchRun = useRef(0);

  const priceResults = useCallback(async (searchResults: MarketSearchResult[], run: number, searchQuery: string) => {
    const priced: MarketSearchResult[] = [];

    for (const result of searchResults) {
      if (searchRun.current !== run) return priced;
      if (result.price > 0 && result.priceOptions?.length) {
        priced.push(result);
        continue;
      }
      if (!result.pricechartingId) continue;

      const response = await fetch(`/api/market/product?id=${encodeURIComponent(result.pricechartingId)}&q=${encodeURIComponent(searchQuery || result.title)}`);
      const data = await response.json() as { results: MarketSearchResult[] };
      const hydrated = data.results[0];

      if (hydrated?.price && hydrated.price > 0) priced.push({ ...hydrated, id: result.id });
    }

    return priced;
  }, []);

  const searchFor = useCallback(async (value = query) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const run = searchRun.current + 1;
    searchRun.current = run;
    setQuery(value);
    setStatus("searching");
    setValuation(null);
    setResults([]);

    const response = await fetch(`/api/market/search?q=${encodeURIComponent(trimmed)}&limit=50`);
    const data = await response.json() as { results: MarketSearchResult[]; source: string; valuation?: PublicValuation };
    if (searchRun.current !== run) return;

    setSource(data.source);
    setStatus("pricing");
    const priced = await priceResults(data.results, run, trimmed);
    if (searchRun.current !== run) return;

    setResults(priced);
    setValuation(firstValuation(priced));
    setStatus("idle");
  }, [priceResults, query]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setValuation(null);
      setSource("");
      setStatus("idle");
      return;
    }

    const timer = window.setTimeout(() => {
      void searchFor(query);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [query, searchFor]);

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
      const hydrated = data.results[0];
      if (hydrated?.price && hydrated.price > 0) onSelect(hydrated);
    } finally {
      setPickingId(null);
    }
  }

  const isWorking = status !== "idle";

  return (
    <section className={compact ? "" : "vault-panel rounded-lg p-5"}>
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void searchFor(); }}
            className="form-input pl-10"
            placeholder="Search PriceCharting: Charizard, Mew ex, EarthBound..."
          />
        </label>
        <button onClick={() => searchFor()} className="rounded bg-vault-gold px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-vault-black transition hover:bg-vault-gold-light">
          {isWorking ? "Searching" : "Search Guide Value"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {["Charizard", "Mew ex", "Pokemon 151"].map((example) => (
          <button key={example} onClick={() => void searchFor(example)} className="rounded border border-vault-border bg-vault-black px-3 py-1.5 text-[11px] text-vault-muted transition hover:border-vault-bright hover:text-vault-text">
            {example}
          </button>
        ))}
      </div>

      {source ? <p className="mt-3 text-xs text-vault-faint">Source: {sourceLabel(source)} - showing priced PriceCharting results only.</p> : null}

      {valuation?.marketValue ? (
        <div className="mt-4 rounded-[10px] border border-vault-border bg-vault-black p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="section-label">Top Guide Value</p>
              <p className="data mt-2 text-3xl text-vault-gold">{currency.format(valuation.marketValue)}</p>
            </div>
            <Confidence confidence={valuation.confidence} />
          </div>
          <p className="mt-3 text-xs text-vault-muted">
            {`Top match - ${valuation.sampleSize} yearly sales signal${valuation.sampleSize === 1 ? "" : "s"} - Condition range ${currency.format(valuation.priceLow ?? 0)} to ${currency.format(valuation.priceHigh ?? 0)}`}
          </p>
        </div>
      ) : null}

      {isWorking ? <SearchPreparing status={status} /> : null}

      {!isWorking && query.trim().length >= 2 && !results.length ? (
        <p className="mt-5 rounded-[10px] border border-dashed border-vault-border p-5 text-sm leading-6 text-vault-muted">
          No priced PriceCharting matches came back. Try a more specific name, set, or card number.
        </p>
      ) : null}

      {results.length ? (
        <div className="mt-5 grid gap-3">
          {results.map((result) => (
            <article key={result.id} className="grid gap-4 rounded-[10px] border border-vault-border bg-vault-surface p-4 transition hover:-translate-y-0.5 hover:border-vault-bright sm:grid-cols-[64px_1fr_auto] sm:items-center">
              <div className="h-16 w-16 overflow-hidden rounded-md border border-vault-border bg-vault-black">
                {result.imageUrl ? <SearchResultImage src={result.imageUrl} alt="" /> : <TrendingUp className="m-5 text-vault-gold" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium text-vault-text">{result.title}</h3>
                  <Badge tone="muted">{categoryLabel(result.category)}</Badge>
                </div>
                <p className="mt-2 text-xs text-vault-muted">
                  {result.condition ?? "Guide value"} - {result.pricechartingConsole ?? "PriceCharting"} - {result.priceConfidence ?? result.confidence} confidence - {result.soldCount ?? 0} yearly sales signal
                </p>
              </div>
              <div className="flex items-center gap-3 sm:justify-end">
                <span className="data text-xl text-vault-gold">{currency.format(result.price)}</span>
                {onSelect ? (
                  <button
                    onClick={() => void pickResult(result)}
                    disabled={pickingId === result.id}
                    className={`rounded border px-3 py-2 text-xs transition ${selectedIds.includes(result.id) ? "border-vault-gold bg-vault-gold/10 text-vault-gold" : "border-vault-border text-vault-text hover:border-vault-bright"}`}
                  >
                    {pickingId === result.id ? "Loading" : selectedIds.includes(result.id) ? "Picked" : actionLabel}
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

function SearchPreparing({ status }: { status: "searching" | "pricing" | "idle" }) {
  return (
    <div className="mt-5 rounded-[10px] border border-vault-border bg-vault-black p-5">
      <p className="section-label">{status === "searching" ? "Searching PriceCharting" : "Preparing Guide Values"}</p>
      <div className="mt-4 grid gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid animate-pulse gap-4 rounded-md border border-vault-border bg-vault-surface p-4 sm:grid-cols-[64px_1fr_100px] sm:items-center">
            <div className="h-16 w-16 rounded bg-vault-border" />
            <div className="space-y-2">
              <div className="h-3 w-2/3 rounded bg-vault-border" />
              <div className="h-2 w-1/2 rounded bg-vault-border" />
            </div>
            <div className="h-5 rounded bg-vault-border" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SearchResultImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) return <TrendingUp className="m-5 text-vault-gold" />;

  // The source can be a dynamic local proxy route; using a plain image avoids Next optimizer 400s.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-full w-full object-cover" onError={() => setFailed(true)} />;
}

function firstValuation(results: MarketSearchResult[]): PublicValuation | null {
  const first = results.find((result) => result.price > 0);
  if (!first) return null;

  return {
    marketValue: first.price,
    priceLow: first.priceLow ?? first.price,
    priceHigh: first.priceHigh ?? first.price,
    sampleSize: first.soldCount ?? 1,
    lastSalePrice: first.lastSalePrice ?? first.price,
    lastSaleDate: first.lastSaleDate ?? null,
    confidence: first.priceConfidence ?? "LOW"
  };
}

function Confidence({ confidence }: { confidence: PublicValuation["confidence"] }) {
  const tone = confidence === "HIGH" ? "bg-vault-green" : confidence === "MEDIUM" ? "bg-vault-gold" : confidence === "LOW" ? "bg-vault-red" : "bg-vault-faint";

  return (
    <span className="inline-flex items-center gap-2 rounded border border-vault-border bg-vault-surface px-3 py-2 font-mono text-[11px] text-vault-muted">
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      {confidence}
    </span>
  );
}

function sourceLabel(source: string) {
  if (source === "pricecharting_api") return "PriceCharting API";
  if (source === "meilisearch_pricecharting_catalog") return "VAULT Meilisearch catalog";
  if (source === "pricecharting_catalog") return "VAULT local PriceCharting catalog";
  if (source === "pricecharting_cache") return "VAULT price cache";
  if (source === "mock") return "VAULT demo PriceCharting model";
  return "PriceCharting";
}
