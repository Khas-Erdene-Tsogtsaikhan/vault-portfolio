import type { Category, MarketSearchResult } from "@/lib/types";
import { inferPriceChartingCategory, normalizePriceKey, type PriceChartingProduct } from "@/lib/pricecharting";

export interface PriceChartingSearchDocument {
  id: string;
  pricecharting_id: string;
  product_name: string;
  console_name: string;
  category: Category | string;
  brand: string;
  loose_price: number | null;
  cib_price: number | null;
  new_price: number | null;
  graded_price: number | null;
  psa_10_price: number | null;
  box_only_price: number | null;
  manual_only_price: number | null;
  sales_volume: number;
  has_loose_price: boolean;
  has_graded_price: boolean;
  has_new_price: boolean;
  image_url: string | null;
  price_fields: Record<string, number>;
  last_synced_at: string;
}

const priceFieldLabels: Array<[string, string]> = [
  ["loose-price", "Loose / Ungraded"],
  ["cib-price", "CIB / Grade 7"],
  ["new-price", "New / Sealed"],
  ["graded-price", "Graded / PSA 9"],
  ["manual-only-price", "PSA 10"],
  ["box-only-price", "BGS 9.5 / Box Only"],
  ["bgs-10-price", "BGS 10"],
  ["condition-17-price", "CGC 10"],
  ["condition-18-price", "SGC 10"]
];

export function csvRowToSearchDocument(row: Record<string, string>, fallbackCategory?: string): PriceChartingSearchDocument | null {
  const pricechartingId = field(row, "id") || field(row, "pricecharting-id") || field(row, "product-id");
  const productName = field(row, "product-name") || field(row, "product name") || field(row, "name");
  if (!pricechartingId || !productName) return null;

  const consoleName = field(row, "console-name") || field(row, "console name") || field(row, "console") || "";
  const product: PriceChartingProduct = {
    id: pricechartingId,
    "product-name": productName,
    "console-name": consoleName
  };
  const priceFields = collectPriceFields(row);
  const category = normalizeCategory(fallbackCategory) ?? inferPriceChartingCategory(product);
  const loose = priceFields["loose-price"] ?? null;
  const graded = priceFields["graded-price"] ?? null;
  const nextNew = priceFields["new-price"] ?? null;

  return {
    id: `pc_${pricechartingId}`,
    pricecharting_id: pricechartingId,
    product_name: productName,
    console_name: consoleName,
    category,
    brand: firstToken(productName),
    loose_price: loose,
    cib_price: priceFields["cib-price"] ?? null,
    new_price: nextNew,
    graded_price: graded,
    psa_10_price: priceFields["manual-only-price"] ?? null,
    box_only_price: priceFields["box-only-price"] ?? null,
    manual_only_price: priceFields["manual-only-price"] ?? null,
    sales_volume: integerField(row, "sales-volume"),
    has_loose_price: Boolean(loose),
    has_graded_price: Boolean(graded),
    has_new_price: Boolean(nextNew),
    image_url: normalizeImage(field(row, "image-url") || field(row, "image")),
    price_fields: priceFields,
    last_synced_at: new Date().toISOString()
  };
}

export function searchDocumentToResult(document: PriceChartingSearchDocument, query = ""): MarketSearchResult | null {
  const options = priceFieldLabels
    .map(([fieldName, label]) => ({ field: fieldName, label, value: centsToDollars(document.price_fields[fieldName]) }))
    .filter((option) => option.value > 0);
  if (!options.length) return null;

  const option = chooseOption(options, query);
  const values = options.map((item) => item.value);
  const salesVolume = Number(document.sales_volume ?? 0);

  return {
    id: `pricecharting-${document.pricecharting_id}-${option.field}`,
    title: document.product_name,
    category: normalizeCategory(document.category) ?? "other",
    imageUrl: document.image_url ?? priceChartingImageProxyUrl(document.product_name, document.console_name),
    price: option.value,
    source: "PriceCharting Catalog",
    confidence: salesVolume >= 100 ? "High" : salesVolume >= 20 ? "Medium" : "Low",
    soldCount: salesVolume || options.length,
    condition: option.label,
    soldAt: new Date().toISOString(),
    priceLow: Math.min(...values),
    priceHigh: Math.max(...values),
    avgPrice: Math.round(values.reduce((sum, value) => sum + value, 0) / values.length),
    lastSalePrice: option.value,
    lastSaleDate: new Date().toISOString(),
    priceConfidence: salesVolume >= 100 ? "HIGH" : salesVolume >= 20 ? "MEDIUM" : "LOW",
    searchQuery: query,
    marketStatus: "recent_sales",
    pricechartingId: document.pricecharting_id,
    pricechartingConsole: document.console_name,
    pricechartingPriceField: option.field,
    priceOptions: options
  };
}

function collectPriceFields(row: Record<string, string>) {
  const fields: Record<string, number> = {};
  for (const [key, raw] of Object.entries(row)) {
    if (!key.endsWith("-price")) continue;
    const cents = parseCents(raw);
    if (cents > 0) fields[key] = cents;
  }
  return fields;
}

function chooseOption(options: Array<{ field: string; label: string; value: number }>, query: string) {
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

function normalizeCategory(value: unknown): Category | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = normalizePriceKey(value).replace(/-/g, "_");
  if (/pokemon|magic|yugioh|lorcana|sports.*cards|trading.*cards/.test(normalized)) return "trading_cards";
  if (/video.*game|games|nintendo|playstation|xbox|sega/.test(normalized)) return "video_games";
  if (/comic/.test(normalized)) return "comics";
  if (/coin/.test(normalized)) return "coins";
  if (/funko/.test(normalized)) return "funko";
  if (/lego/.test(normalized)) return "lego";
  if (normalized === "trading_cards" || normalized === "video_games" || normalized === "comics" || normalized === "coins" || normalized === "funko" || normalized === "lego") return normalized;
  return null;
}

function field(row: Record<string, string>, name: string) {
  return row[name]?.trim() || row[normalizePriceKey(name)]?.trim() || "";
}

function integerField(row: Record<string, string>, name: string) {
  const parsed = Number(field(row, name).replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function parseCents(raw: string) {
  const clean = raw?.replace(/[$,]/g, "").trim();
  if (!clean) return 0;
  const number = Number(clean);
  if (!Number.isFinite(number)) return 0;
  return clean.includes(".") ? Math.round(number * 100) : Math.round(number);
}

function centsToDollars(value: unknown) {
  const cents = Number(value ?? 0);
  return Number.isFinite(cents) && cents > 0 ? Math.round(cents) / 100 : 0;
}

function normalizeImage(raw: string) {
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/")) return `https://www.pricecharting.com${raw}`;
  return raw;
}

function firstToken(value: string) {
  return value.split(/\s+/)[0] ?? "";
}

function priceChartingImageProxyUrl(name: string, consoleName: string) {
  const params = new URLSearchParams({ name, console: consoleName || "PriceCharting" });
  return `/api/market/image?${params.toString()}`;
}
