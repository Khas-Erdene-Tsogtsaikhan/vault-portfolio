import type { Category, MarketSearchResult, VaultItem } from "@/lib/types";

export interface EbaySoldListing {
  itemId: string;
  title: string;
  price: number;
  soldAt: string;
  imageUrl?: string;
  url?: string;
  condition?: string;
}

export interface EbayValuation {
  marketValue: number | null;
  priceLow: number | null;
  priceHigh: number | null;
  avgPrice: number | null;
  sampleSize: number;
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  cleanedListings: EbaySoldListing[];
  rawListings: EbaySoldListing[];
  suspicious?: boolean;
}

const categoryIds: Partial<Record<Category, string>> = {
  trading_cards: "183454",
  sneakers: "15709",
  watches: "31387",
  wine: "3827"
};

const cache = new Map<string, { expiresAt: number; value: unknown }>();

export function buildEbayQuery(input: Pick<VaultItem, "name" | "category" | "brand" | "referenceNumber" | "condition"> | { query: string; category?: Category }) {
  if ("query" in input) return normalizeSpaces(input.query);
  if (input.category === "trading_cards") return normalizeSpaces(`${input.name} ${input.referenceNumber ?? ""} ${gradeFromCondition(input.condition)}`);
  if (input.category === "sneakers") return normalizeSpaces(`${input.brand} ${input.name} ${input.referenceNumber ?? ""} ${input.condition}`);
  if (input.category === "watches") return normalizeSpaces(`${input.brand} ${input.name} ${input.referenceNumber ?? ""}`);
  if (input.category === "wine") return normalizeSpaces(`${input.brand} ${input.name} ${input.referenceNumber ?? ""}`);
  return normalizeSpaces(`${input.brand} ${input.name} ${input.referenceNumber ?? ""} ${input.condition}`);
}

export function ebayCategoryId(category: Category) {
  return categoryIds[category];
}

export function getCached<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit || hit.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

export function setCached(key: string, value: unknown, ttlSeconds: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export function calculateMarketValue(listings: EbaySoldListing[], previousValue?: number): EbayValuation {
  const sorted = [...listings].filter((listing) => Number.isFinite(listing.price) && listing.price > 0).sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
  const prices = sorted.map((listing) => listing.price).sort((a, b) => a - b);
  if (!prices.length) {
    return emptyValuation(sorted);
  }

  const q1 = percentile(prices, 0.25);
  const q3 = percentile(prices, 0.75);
  const iqr = q3 - q1;
  const lowFence = q1 - 1.5 * iqr;
  const highFence = q3 + 1.5 * iqr;
  const cleaned = sorted.filter((listing) => listing.price >= lowFence && listing.price <= highFence);
  const cleanedPrices = cleaned.map((listing) => listing.price).sort((a, b) => a - b);
  if (!cleanedPrices.length) return emptyValuation(sorted);

  const marketValue = median(cleanedPrices);
  const lastSale = sorted[0];
  const lastSaleAgeDays = ageInDays(lastSale.soldAt);
  const confidence = confidenceFor(cleanedPrices.length, lastSaleAgeDays);
  const suspicious = previousValue ? Math.abs((marketValue - previousValue) / previousValue) > 0.5 : false;

  return {
    marketValue,
    priceLow: Math.min(...cleanedPrices),
    priceHigh: Math.max(...cleanedPrices),
    avgPrice: mean(cleanedPrices),
    sampleSize: cleanedPrices.length,
    lastSalePrice: lastSale.price,
    lastSaleDate: lastSale.soldAt,
    confidence,
    cleanedListings: cleaned,
    rawListings: sorted,
    suspicious
  };
}

export function valuationToResults(query: string, category: Category, valuation: EbayValuation): MarketSearchResult[] {
  if (!valuation.rawListings.length) return [];
  return valuation.rawListings.slice(0, 5).map((listing, index) => ({
    id: listing.itemId,
    title: listing.title,
    category,
    imageUrl: listing.imageUrl,
    price: index === 0 && valuation.marketValue ? valuation.marketValue : listing.price,
    source: "eBay Sold Listings",
    confidence: toTitleConfidence(valuation.confidence),
    url: listing.url,
    soldCount: valuation.sampleSize,
    condition: listing.condition,
    soldAt: listing.soldAt,
    priceLow: valuation.priceLow ?? undefined,
    priceHigh: valuation.priceHigh ?? undefined,
    avgPrice: valuation.avgPrice ?? undefined,
    lastSalePrice: valuation.lastSalePrice ?? undefined,
    lastSaleDate: valuation.lastSaleDate ?? undefined,
    priceConfidence: valuation.confidence,
    searchQuery: query,
    marketStatus: valuation.confidence === "NONE" ? "no_recent_sales" : "recent_sales"
  }));
}

function emptyValuation(rawListings: EbaySoldListing[]): EbayValuation {
  return {
    marketValue: null,
    priceLow: null,
    priceHigh: null,
    avgPrice: null,
    sampleSize: 0,
    lastSalePrice: rawListings[0]?.price ?? null,
    lastSaleDate: rawListings[0]?.soldAt ?? null,
    confidence: "NONE",
    cleanedListings: [],
    rawListings
  };
}

function confidenceFor(sampleSize: number, lastSaleAgeDays: number) {
  if (sampleSize >= 10 && lastSaleAgeDays < 30) return "HIGH";
  if (sampleSize >= 3 && lastSaleAgeDays < 90) return "MEDIUM";
  if (sampleSize >= 1 && lastSaleAgeDays < 180) return "LOW";
  return "NONE";
}

function toTitleConfidence(confidence: EbayValuation["confidence"]): MarketSearchResult["confidence"] {
  if (confidence === "HIGH") return "High";
  if (confidence === "MEDIUM") return "Medium";
  return "Low";
}

function gradeFromCondition(condition: string) {
  const grade = condition.match(/\b(PSA|BGS|CGC)\s*([0-9](?:\.[0-9])?|10)\b/i);
  return grade ? `${grade[1].toUpperCase()} ${grade[2]}` : condition;
}

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function percentile(values: number[], p: number) {
  if (!values.length) return 0;
  const index = (values.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return values[lower];
  return values[lower] + (values[upper] - values[lower]) * (index - lower);
}

function median(values: number[]) {
  return percentile(values, 0.5);
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ageInDays(date: string) {
  return (Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000);
}
