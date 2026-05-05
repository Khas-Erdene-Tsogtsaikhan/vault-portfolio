import { NextResponse } from "next/server";
import { buildEbayQuery, calculateMarketValue, ebayCategoryId, getCached, setCached, valuationToResults, type EbaySoldListing, type EbayValuation } from "@/lib/ebay-valuation";
import { inferCategory, mockMarketSearch, mockSoldListings, summarizeMarketValue } from "@/lib/market-search";

export const dynamic = "force-dynamic";

interface FindingItem {
  itemId?: string[];
  title?: string[];
  galleryURL?: string[];
  viewItemURL?: string[];
  sellingStatus?: Array<{ currentPrice?: Array<{ __value__?: string }> }>;
  listingInfo?: Array<{ endTime?: string[] }>;
  condition?: Array<{ conditionDisplayName?: string[] }>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q")?.trim() ?? "";
  const category = inferCategory(rawQuery);
  const query = buildEbayQuery({ query: rawQuery, category });
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 20);

  if (!query) {
    return NextResponse.json({ results: [], valuation: emptySummary(), source: "empty" });
  }

  const cacheKey = `ebay:finding:sold:${category}:${query.toLowerCase()}`;
  const cached = getCached<{ results: ReturnType<typeof valuationToResults>; valuation: EbayValuation; source: string }>(cacheKey);
  if (cached) return NextResponse.json({ ...cached, cache: "hit" });

  const appId = process.env.EBAY_APP_ID ?? process.env.EBAY_CLIENT_ID;
  if (!appId) {
    const priceCharting = await fetchPriceChartingFallback(query, category);
    if (priceCharting) return NextResponse.json(priceCharting);
    const valuation = calculateMarketValue(mockSoldListings(query, category));
    const results = valuationToResults(query, category, valuation).slice(0, 5);
    return NextResponse.json({ results, valuation: publicValuation(valuation), source: "mock", note: "Set EBAY_APP_ID for eBay Finding API sold listings. Set PRICECHARTING_API_TOKEN for the fallback." });
  }

  try {
    const response = await fetch(findingUrl({ appId, query, category, limit }), { signal: AbortSignal.timeout(5000), next: { revalidate: 60 * 60 * 6 } });

    if (response.status === 429) {
      const valuation = calculateMarketValue(mockSoldListings(query, category));
      const results = valuationToResults(query, category, valuation).slice(0, 5);
      return NextResponse.json({ results, valuation: publicValuation(valuation), source: "mock", note: "eBay rate limit hit; queue should pause for 1 hour." }, { status: 200 });
    }

    if (!response.ok) {
      const priceCharting = await fetchPriceChartingFallback(query, category);
      if (priceCharting) return NextResponse.json({ ...priceCharting, note: `eBay Finding API returned ${response.status}; using PriceCharting fallback.` });
      const valuation = calculateMarketValue(mockSoldListings(query, category));
      const results = valuationToResults(query, category, valuation).slice(0, 5);
      return NextResponse.json({ results, valuation: publicValuation(valuation), source: "mock", note: `eBay Finding API returned ${response.status}; using mock fallback.` });
    }

    const data = await response.json();
    const listings = parseFindingResponse(data);
    const valuation = calculateMarketValue(listings);
    const results = valuationToResults(query, category, valuation).slice(0, 5);
    const payload = { results, valuation: publicValuation(valuation), source: "ebay_finding_api" };
    setCached(cacheKey, payload, 21600);
    return NextResponse.json({ ...payload, cache: "miss" });
  } catch {
    const priceCharting = await fetchPriceChartingFallback(query, category);
    if (priceCharting) return NextResponse.json({ ...priceCharting, note: "eBay timeout or network error; using PriceCharting fallback." });
    const valuation = calculateMarketValue(mockSoldListings(query, category));
    const results = valuationToResults(query, category, valuation).slice(0, 5);
    return NextResponse.json({ results, valuation: publicValuation(valuation), source: "mock", note: "eBay timeout or network error; keeping mock fallback data." });
  }
}

function findingUrl({ appId, query, category, limit }: { appId: string; query: string; category: ReturnType<typeof inferCategory>; limit: number }) {
  const url = new URL("https://svcs.ebay.com/services/search/FindingService/v1");
  const now = new Date();
  const from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  url.searchParams.set("OPERATION-NAME", "findCompletedItems");
  url.searchParams.set("SERVICE-VERSION", "1.13.0");
  url.searchParams.set("SECURITY-APPNAME", appId);
  url.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
  url.searchParams.set("REST-PAYLOAD", "true");
  url.searchParams.set("keywords", query);
  url.searchParams.set("paginationInput.entriesPerPage", String(limit));
  url.searchParams.set("sortOrder", "EndTimeSoonest");
  const categoryId = ebayCategoryId(category);
  if (categoryId) url.searchParams.set("categoryId", categoryId);
  url.searchParams.set("itemFilter(0).name", "SoldItemsOnly");
  url.searchParams.set("itemFilter(0).value", "true");
  url.searchParams.set("itemFilter(1).name", "EndTimeFrom");
  url.searchParams.set("itemFilter(1).value", from.toISOString());
  url.searchParams.set("itemFilter(2).name", "EndTimeTo");
  url.searchParams.set("itemFilter(2).value", now.toISOString());
  if (category === "sneakers") {
    url.searchParams.set("itemFilter(3).name", "Condition");
    url.searchParams.set("itemFilter(3).value", "1000");
  }
  return url;
}

function parseFindingResponse(data: unknown): EbaySoldListing[] {
  const root = data as { findCompletedItemsResponse?: Array<{ searchResult?: Array<{ item?: FindingItem[] }> }> };
  const items = root.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item ?? [];
  return items.map((item) => ({
    itemId: item.itemId?.[0] ?? crypto.randomUUID(),
    title: item.title?.[0] ?? "eBay sold listing",
    imageUrl: item.galleryURL?.[0],
    url: item.viewItemURL?.[0],
    price: Number(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ ?? 0),
    soldAt: item.listingInfo?.[0]?.endTime?.[0] ?? new Date().toISOString(),
    condition: item.condition?.[0]?.conditionDisplayName?.[0]
  })).filter((item) => item.price > 0);
}

function publicValuation(valuation: EbayValuation) {
  return {
    marketValue: valuation.marketValue,
    priceLow: valuation.priceLow,
    priceHigh: valuation.priceHigh,
    avgPrice: valuation.avgPrice,
    sampleSize: valuation.sampleSize,
    lastSalePrice: valuation.lastSalePrice,
    lastSaleDate: valuation.lastSaleDate,
    confidence: valuation.confidence,
    suspicious: valuation.suspicious ?? false
  };
}

function emptySummary() {
  return { marketValue: null, priceLow: null, priceHigh: null, avgPrice: null, sampleSize: 0, lastSalePrice: null, lastSaleDate: null, confidence: "NONE" };
}

async function fetchPriceChartingFallback(query: string, category: ReturnType<typeof inferCategory>) {
  const token = process.env.PRICECHARTING_API_TOKEN;
  if (!token || !["trading_cards", "books", "coins"].includes(category)) return null;

  const url = new URL("https://www.pricecharting.com/api/product");
  url.searchParams.set("t", token);
  url.searchParams.set("q", query);

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000), next: { revalidate: 60 * 60 * 12 } });
    if (!response.ok) return null;
    const data = await response.json() as Record<string, unknown>;
    if (data.status !== "success") return null;
    const priceCents = pickPriceChartingCents(data, query);
    if (!priceCents) return null;
    const price = Math.round(priceCents / 100);
    const title = [data["product-name"], data["console-name"]].filter(Boolean).join(" · ") || query;
    const now = new Date().toISOString();
    return {
      results: [{
        id: `pricecharting-${data.id ?? query}`,
        title,
        category,
        price,
        source: "PriceCharting",
        confidence: "Medium",
        soldCount: 1,
        condition: priceChartingConditionLabel(query),
        soldAt: now,
        priceLow: price,
        priceHigh: price,
        avgPrice: price,
        lastSalePrice: price,
        lastSaleDate: now,
        priceConfidence: "MEDIUM",
        searchQuery: query,
        marketStatus: "recent_sales"
      }],
      valuation: {
        marketValue: price,
        priceLow: price,
        priceHigh: price,
        avgPrice: price,
        sampleSize: 1,
        lastSalePrice: price,
        lastSaleDate: now,
        confidence: "MEDIUM",
        suspicious: false
      },
      source: "pricecharting_api"
    };
  } catch {
    return null;
  }
}

function pickPriceChartingCents(data: Record<string, unknown>, query: string) {
  const normalized = query.toLowerCase();
  const candidates = [
    normalized.includes("psa 10") || normalized.includes("grade 10") ? "graded-price" : "",
    normalized.includes("psa 10") || normalized.includes("grade 10") ? "condition-17-price" : "",
    normalized.includes("bgs 10") ? "bgs-10-price" : "",
    normalized.includes("new") || normalized.includes("sealed") ? "new-price" : "",
    normalized.includes("cib") ? "cib-price" : "",
    "graded-price",
    "new-price",
    "cib-price",
    "loose-price"
  ].filter(Boolean);
  for (const key of candidates) {
    const value = Number(data[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function priceChartingConditionLabel(query: string) {
  const normalized = query.toLowerCase();
  if (normalized.includes("psa 10")) return "PSA 10";
  if (normalized.includes("bgs 10")) return "BGS 10";
  if (normalized.includes("sealed")) return "Sealed";
  if (normalized.includes("cib")) return "CIB";
  return "PriceCharting match";
}
