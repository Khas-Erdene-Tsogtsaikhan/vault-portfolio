import type { Category, MarketSearchResult, VaultItem } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase-server";

export interface PriceChartingProduct {
  status?: string;
  id: string;
  "product-name": string;
  "console-name": string;
  "release-date"?: string;
  "sales-volume"?: string | number;
  "image-url"?: string;
  "loose-price"?: number;
  "cib-price"?: number;
  "new-price"?: number;
  "graded-price"?: number;
  "box-only-price"?: number;
  "manual-only-price"?: number;
  "bgs-10-price"?: number;
  "condition-17-price"?: number;
  "condition-18-price"?: number;
  [key: string]: unknown;
}

export interface CachedPricePayload {
  results: MarketSearchResult[];
  valuation: PublicValuation;
  source: string;
}

export interface PublicValuation {
  marketValue: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  avgPrice?: number | null;
  sampleSize: number;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
}

const memoryCache = new Map<string, { expiresAt: number; value: CachedPricePayload }>();
let queue: Promise<unknown> = Promise.resolve();
let lastCallAt = 0;

const priceFields = [
  ["loose-price", "Loose / Ungraded"],
  ["cib-price", "CIB / Grade 7"],
  ["new-price", "New / Sealed"],
  ["graded-price", "Graded / PSA 9"],
  ["manual-only-price", "PSA 10"],
  ["box-only-price", "BGS 9.5 / Box Only"],
  ["bgs-10-price", "BGS 10"],
  ["condition-17-price", "CGC 10"],
  ["condition-18-price", "SGC 10"]
] as const;

export function normalizePriceKey(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function searchPriceCharting(rawQuery: string, limit = 5): Promise<CachedPricePayload> {
  const query = rawQuery.trim();
  const identifier = normalizePriceKey(query);
  const cached = await readCache(identifier);
  if (cached) return { ...cached, source: cached.source === "mock" ? "mock" : "pricecharting_cache" };

  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) {
    const payload = mockPayload(query);
    await writeCache(identifier, payload);
    return payload;
  }

  const matches = await enqueuePriceChartingCall(() => fetchProducts(token, query, limit));
  const detailed = [];
  for (const match of matches.slice(0, Math.min(limit, 5))) {
    const detailKey = normalizePriceKey(`pc-${match.id}`);
    const detailCache = await readCache(detailKey);
    if (detailCache?.results[0]) {
      detailed.push(resultToProduct(detailCache.results[0]));
      continue;
    }
    const product = await enqueuePriceChartingCall(() => fetchProduct(token, { id: match.id }));
    detailed.push(product);
  }

  const results = detailed.map((product) => productToResult(product, query)).filter(Boolean) as MarketSearchResult[];
  const valuation = resultsToValuation(results);
  const payload = { results, valuation, source: "pricecharting_api" };
  await writeCache(identifier, payload);
  for (const result of results) await writeCache(normalizePriceKey(`pc-${result.pricechartingId}`), { results: [result], valuation: resultToValuation(result), source: "pricecharting_api" });
  return payload;
}

export async function refreshPriceChartingProduct(item: Pick<VaultItem, "id" | "pricechartingId" | "pricechartingPriceField" | "currentValueUser">) {
  if (!item.pricechartingId) return null;
  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) return null;
  const product = await enqueuePriceChartingCall(() => fetchProduct(token, { id: item.pricechartingId as string }));
  const result = productToResult(product, product["product-name"], item.pricechartingPriceField);
  if (!result) return null;
  await writeCache(normalizePriceKey(`pc-${item.pricechartingId}`), { results: [result], valuation: resultToValuation(result), source: "pricecharting_api" });
  return result;
}

export function choosePriceOption(product: PriceChartingProduct, query: string, preferredField?: string) {
  const options = getPriceOptions(product);
  if (!options.length) return null;
  if (preferredField) return options.find((option) => option.field === preferredField) ?? options[0];
  const normalized = query.toLowerCase();
  if (/bgs\s*10/.test(normalized)) return options.find((option) => option.field === "bgs-10-price") ?? options[0];
  if (/cgc\s*10/.test(normalized)) return options.find((option) => option.field === "condition-17-price") ?? options[0];
  if (/sgc\s*10/.test(normalized)) return options.find((option) => option.field === "condition-18-price") ?? options[0];
  if (/psa\s*10|grade\s*10/.test(normalized)) return options.find((option) => option.field === "manual-only-price") ?? options[0];
  if (/psa\s*9|grade\s*9/.test(normalized)) return options.find((option) => option.field === "graded-price") ?? options[0];
  if (/sealed|new/.test(normalized)) return options.find((option) => option.field === "new-price") ?? options[0];
  if (/\bcib\b|complete/.test(normalized)) return options.find((option) => option.field === "cib-price") ?? options[0];
  return options[0];
}

export function getPriceOptions(product: PriceChartingProduct) {
  return priceFields
    .map(([field, label]) => ({ field, label, value: centsToDollars(product[field]) }))
    .filter((option) => option.value > 0);
}

export function priceFieldLabel(field?: string) {
  return priceFields.find(([candidate]) => candidate === field)?.[1] ?? "Guide Value";
}

function productToResult(product: PriceChartingProduct, query: string, preferredField?: string): MarketSearchResult | null {
  const option = choosePriceOption(product, query, preferredField);
  if (!option) return null;
  const options = getPriceOptions(product);
  const salesVolume = Number(product["sales-volume"] ?? 0);
  return {
    id: `pricecharting-${product.id}-${option.field}`,
    title: product["product-name"],
    category: inferPriceChartingCategory(product),
    imageUrl: normalizeImageUrl(product["image-url"]),
    price: option.value,
    source: "PriceCharting Guide Value",
    confidence: salesVolume >= 100 ? "High" : salesVolume >= 20 ? "Medium" : "Low",
    soldCount: salesVolume || options.length,
    condition: option.label,
    soldAt: new Date().toISOString(),
    priceLow: Math.min(...options.map((item) => item.value)),
    priceHigh: Math.max(...options.map((item) => item.value)),
    avgPrice: Math.round(options.reduce((sum, item) => sum + item.value, 0) / options.length),
    lastSalePrice: option.value,
    lastSaleDate: new Date().toISOString(),
    priceConfidence: salesVolume >= 100 ? "HIGH" : salesVolume >= 20 ? "MEDIUM" : "LOW",
    searchQuery: query,
    marketStatus: "recent_sales",
    pricechartingId: product.id,
    pricechartingConsole: product["console-name"],
    pricechartingPriceField: option.field,
    priceOptions: options
  };
}

function resultToProduct(result: MarketSearchResult): PriceChartingProduct {
  return {
    id: result.pricechartingId ?? result.id.replace("pricecharting-", ""),
    "product-name": result.title,
    "console-name": result.pricechartingConsole ?? "PriceCharting",
    "sales-volume": result.soldCount ?? 0,
    "image-url": result.imageUrl,
    [result.pricechartingPriceField ?? "loose-price"]: Math.round(result.price * 100)
  };
}

function resultsToValuation(results: MarketSearchResult[]): PublicValuation {
  if (!results.length) return emptyValuation();
  return resultToValuation(results[0]);
}

function resultToValuation(result: MarketSearchResult): PublicValuation {
  return {
    marketValue: result.price,
    priceLow: result.priceLow ?? result.price,
    priceHigh: result.priceHigh ?? result.price,
    avgPrice: result.avgPrice ?? result.price,
    sampleSize: result.soldCount ?? 1,
    lastSalePrice: result.lastSalePrice ?? result.price,
    lastSaleDate: result.lastSaleDate ?? null,
    confidence: result.priceConfidence ?? "LOW"
  };
}

function emptyValuation(): PublicValuation {
  return { marketValue: null, priceLow: null, priceHigh: null, avgPrice: null, sampleSize: 0, lastSalePrice: null, lastSaleDate: null, confidence: "NONE" };
}

async function fetchProducts(token: string, query: string, limit: number) {
  const url = new URL("https://www.pricecharting.com/api/products");
  url.searchParams.set("t", token);
  url.searchParams.set("q", query);
  const response = await fetch(url, { signal: AbortSignal.timeout(7000), cache: "no-store" });
  if (!response.ok) throw new Error(`PriceCharting products returned ${response.status}`);
  const data = await response.json() as { status: string; products?: Array<{ id: string; "product-name": string; "console-name": string }> };
  if (data.status === "error") throw new Error("PriceCharting product search failed.");
  return (data.products ?? []).slice(0, limit);
}

async function fetchProduct(token: string, input: { id?: string; q?: string }) {
  const url = new URL("https://www.pricecharting.com/api/product");
  url.searchParams.set("t", token);
  if (input.id) url.searchParams.set("id", input.id);
  if (input.q) url.searchParams.set("q", input.q);
  const response = await fetch(url, { signal: AbortSignal.timeout(7000), cache: "no-store" });
  if (!response.ok) throw new Error(`PriceCharting product returned ${response.status}`);
  const data = await response.json() as PriceChartingProduct & { status: string; "error-message"?: string };
  if (data.status === "error") throw new Error(data["error-message"] ?? "PriceCharting product lookup failed.");
  return data;
}

function enqueuePriceChartingCall<T>(task: () => Promise<T>) {
  const run = queue.then(async () => {
    const wait = Math.max(0, 1100 - (Date.now() - lastCallAt));
    if (wait) await sleep(wait);
    lastCallAt = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

async function readCache(identifier: string): Promise<CachedPricePayload | null> {
  const memory = memoryCache.get(identifier);
  if (memory && memory.expiresAt > Date.now()) return memory.value;
  memoryCache.delete(identifier);
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin.from("price_cache").select("*").eq("item_identifier", identifier).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!data) return null;
  const payload = cacheRowToPayload(data);
  memoryCache.set(identifier, { value: payload, expiresAt: new Date(data.expires_at).getTime() });
  return payload;
}

async function writeCache(identifier: string, payload: CachedPricePayload) {
  memoryCache.set(identifier, { value: payload, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
  if (!supabaseAdmin) return;
  await supabaseAdmin.from("price_cache").upsert({
    item_identifier: identifier,
    source: payload.source,
    market_value: payload.valuation.marketValue,
    price_low: payload.valuation.priceLow,
    price_high: payload.valuation.priceHigh,
    last_sale_price: payload.valuation.lastSalePrice,
    confidence: payload.valuation.confidence,
    raw_response: payload,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  }, { onConflict: "item_identifier" });
}

function cacheRowToPayload(row: any): CachedPricePayload {
  return row.raw_response ?? {
    results: [],
    valuation: {
      marketValue: numberOrNull(row.market_value),
      priceLow: numberOrNull(row.price_low),
      priceHigh: numberOrNull(row.price_high),
      lastSalePrice: numberOrNull(row.last_sale_price),
      lastSaleDate: null,
      sampleSize: 0,
      confidence: row.confidence ?? "NONE"
    },
    source: row.source ?? "pricecharting_cache"
  };
}

function mockPayload(query: string): CachedPricePayload {
  const mockProduct: PriceChartingProduct = {
    id: `mock-${normalizePriceKey(query)}`,
    "product-name": query || "Charizard Base Set",
    "console-name": /game|mario|zelda|pokemon/i.test(query) ? "Pokemon Cards" : "PriceCharting Demo",
    "sales-volume": 124,
    "loose-price": 18400,
    "graded-price": 91000,
    "manual-only-price": 148000,
    "new-price": 32000
  };
  const result = productToResult(mockProduct, query) as MarketSearchResult;
  return { results: [result], valuation: resultToValuation(result), source: "mock" };
}

function inferPriceChartingCategory(product: PriceChartingProduct): Category {
  const value = `${product["console-name"]} ${product["product-name"]}`.toLowerCase();
  if (/pokemon|magic|yugioh|lorcana|card|tcg|baseball|basketball|football|hockey|sports/.test(value)) return "trading_cards";
  if (/comic/.test(value)) return "comics";
  if (/coin|pennies|nickels|dimes|quarters|dollars/.test(value)) return "coins";
  if (/funko/.test(value)) return "funko";
  if (/lego/.test(value)) return "lego";
  if (/book|magazine|strategy guide/.test(value)) return "books";
  if (/nintendo|playstation|xbox|sega|atari|gameboy|switch|nes|snes|super nintendo|gamecube|wii/.test(value)) return "video_games";
  return "other";
}

function normalizeImageUrl(value: unknown) {
  if (typeof value !== "string" || !value) return undefined;
  if (value.startsWith("http")) return value;
  return `https://www.pricecharting.com${value}`;
}

function centsToDollars(value: unknown) {
  const cents = Number(value ?? 0);
  return Number.isFinite(cents) && cents > 0 ? Math.round(cents) / 100 : 0;
}

function numberOrNull(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
