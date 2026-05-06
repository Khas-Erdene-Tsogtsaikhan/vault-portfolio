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

interface PriceChartingCatalogRow {
  pricecharting_id: string;
  product_name: string;
  console_name?: string | null;
  category?: string | null;
  loose_price?: number | null;
  cib_price?: number | null;
  new_price?: number | null;
  graded_price?: number | null;
  psa_10_price?: number | null;
  box_only_price?: number | null;
  manual_only_price?: number | null;
  price_fields?: Record<string, unknown> | null;
  sales_volume?: number | null;
  price_low?: number | null;
  price_high?: number | null;
  image_url?: string | null;
  last_synced_at?: string | null;
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
const CACHE_VERSION = "pc-v5";

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

export async function searchPriceCharting(rawQuery: string, limit = 20): Promise<CachedPricePayload> {
  const query = rawQuery.trim();
  const catalog = await searchCatalog(query, limit);
  if (catalog) return catalog;

  const identifier = `${CACHE_VERSION}:products:${limit}:${normalizePriceKey(query)}`;
  const cached = await readCache(identifier);
  if (cached) return { ...cached, source: cached.source === "mock" ? "mock" : "pricecharting_cache" };

  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) {
    const payload = mockPayload(query);
    await writeCache(identifier, payload);
    return payload;
  }

  const matches = await enqueuePriceChartingCall(() => fetchProducts(token, query, limit));
  const results = await Promise.all(matches.slice(0, Math.min(limit, 20)).map(async (product) => {
    const detailCache = await readCache(productCacheKey(product.id));
    return detailCache?.results[0] ?? productSummaryToResult(product, query);
  }));
  const valuation = resultsToValuation(results);
  const payload = { results, valuation, source: "pricecharting_api" };
  await writeCache(identifier, payload);
  return payload;
}

export async function getPriceChartingProductResult(productId: string, query = "", preferredField?: string): Promise<CachedPricePayload> {
  const catalog = await getCatalogProduct(productId, query, preferredField);
  if (catalog) return catalog;

  const identifier = productCacheKey(productId);
  const cached = await readCache(identifier);
  if (cached?.results[0]?.priceOptions?.length) return { ...cached, source: cached.source === "mock" ? "mock" : "pricecharting_cache" };

  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) {
    const payload = mockPayload(query || productId);
    await writeCache(identifier, payload);
    return payload;
  }

  const product = await enqueuePriceChartingCall(() => fetchProduct(token, { id: productId }));
  const result = productToResult(product, query || product["product-name"], preferredField);
  const payload = { results: result ? [result] : [], valuation: result ? resultToValuation(result) : emptyValuation(), source: "pricecharting_api" };
  await writeCache(identifier, payload);
  return payload;
}

export async function refreshPriceChartingProduct(item: Pick<VaultItem, "id" | "pricechartingId" | "pricechartingPriceField" | "currentValueUser">) {
  if (!item.pricechartingId) return null;
  const catalog = await getCatalogProduct(item.pricechartingId, item.pricechartingId, item.pricechartingPriceField);
  const catalogResult = catalog?.results[0];
  if (catalogResult) return catalogResult;

  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token) return null;
  const product = await enqueuePriceChartingCall(() => fetchProduct(token, { id: item.pricechartingId as string }));
  const result = productToResult(product, product["product-name"], item.pricechartingPriceField);
  if (!result) return null;
  await writeCache(productCacheKey(item.pricechartingId), { results: [result], valuation: resultToValuation(result), source: "pricecharting_api" });
  return result;
}

async function searchCatalog(query: string, limit: number): Promise<CachedPricePayload | null> {
  if (!supabaseAdmin || query.length < 2) return null;
  const { data, error } = await supabaseAdmin.rpc("search_pricecharting_catalog", {
    search_query: query,
    result_limit: limit
  });
  if (error || !data?.length) return null;
  const results = (data as PriceChartingCatalogRow[])
    .map((row) => catalogRowToResult(row, query))
    .filter(Boolean) as MarketSearchResult[];
  if (!results.length) return null;
  return { results, valuation: resultsToValuation(results), source: "pricecharting_catalog" };
}

async function getCatalogProduct(productId: string, query = "", preferredField?: string): Promise<CachedPricePayload | null> {
  if (!supabaseAdmin || !productId) return null;
  const { data, error } = await supabaseAdmin
    .from("pricecharting_catalog")
    .select("*")
    .eq("pricecharting_id", productId)
    .maybeSingle();
  if (error || !data) return null;
  const result = catalogRowToResult(data as PriceChartingCatalogRow, query || data.product_name, preferredField);
  return result ? { results: [result], valuation: resultToValuation(result), source: "pricecharting_catalog" } : null;
}

function catalogRowToResult(row: PriceChartingCatalogRow, query: string, preferredField?: string) {
  const product = catalogRowToProduct(row);
  return productToResult(product, query, preferredField);
}

function catalogRowToProduct(row: PriceChartingCatalogRow): PriceChartingProduct {
  const priceFieldsFromJson = row.price_fields && typeof row.price_fields === "object" ? row.price_fields : {};
  return {
    ...priceFieldsFromJson,
    id: row.pricecharting_id,
    "product-name": row.product_name,
    "console-name": row.console_name ?? "PriceCharting",
    "sales-volume": row.sales_volume ?? 0,
    "image-url": row.image_url ?? undefined,
    "loose-price": row.loose_price ?? numericJsonField(priceFieldsFromJson, "loose-price"),
    "cib-price": row.cib_price ?? numericJsonField(priceFieldsFromJson, "cib-price"),
    "new-price": row.new_price ?? numericJsonField(priceFieldsFromJson, "new-price"),
    "graded-price": row.graded_price ?? numericJsonField(priceFieldsFromJson, "graded-price"),
    "manual-only-price": row.psa_10_price ?? row.manual_only_price ?? numericJsonField(priceFieldsFromJson, "manual-only-price"),
    "box-only-price": row.box_only_price ?? numericJsonField(priceFieldsFromJson, "box-only-price")
  };
}

function numericJsonField(fields: Record<string, unknown>, key: string) {
  const value = Number(fields[key] ?? 0);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function productCacheKey(productId: string) {
  return `${CACHE_VERSION}:product:${productId}`;
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
    imageUrl: normalizeImageUrl(product["image-url"]) ?? priceChartingImageProxyUrl(product),
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

function productSummaryToResult(product: Pick<PriceChartingProduct, "id" | "product-name" | "console-name">, query: string): MarketSearchResult {
  return {
    id: `pricecharting-${product.id}`,
    title: product["product-name"],
    category: inferPriceChartingCategory(product as PriceChartingProduct),
    imageUrl: priceChartingImageProxyUrl(product),
    price: 0,
    source: "PriceCharting Product Search",
    confidence: "Low",
    condition: "Select for guide value",
    soldAt: undefined,
    priceConfidence: "NONE",
    searchQuery: query,
    marketStatus: "no_recent_sales",
    pricechartingId: product.id,
    pricechartingConsole: product["console-name"]
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
    "image-url": undefined,
    "sales-volume": 124,
    "loose-price": 18400,
    "graded-price": 91000,
    "manual-only-price": 148000,
    "new-price": 32000
  };
  const result = productToResult(mockProduct, query) as MarketSearchResult;
  return { results: [result], valuation: resultToValuation(result), source: "mock" };
}

export function inferPriceChartingCategory(product: Pick<PriceChartingProduct, "console-name" | "product-name">): Category {
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

function priceChartingImageProxyUrl(product: Pick<PriceChartingProduct, "product-name" | "console-name">) {
  const params = new URLSearchParams({
    name: product["product-name"],
    console: product["console-name"]
  });
  return `/api/market/image?${params.toString()}`;
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
