import type { EbaySoldListing } from "@/lib/ebay-valuation";
import type { Category, MarketSearchResult } from "@/lib/types";

export function inferCategory(query: string): Category {
  const value = query.toLowerCase();
  if (/(jordan|nike|yeezy|dunk|sneaker|size)/.test(value)) return "sneakers";
  if (/(charizard|pokemon|psa|bgs|tcg|card|mtg|magic)/.test(value)) return "trading_cards";
  if (/(rolex|patek|omega|watch|submariner|nautilus|speedmaster)/.test(value)) return "watches";
  if (/(wine|chateau|bordeaux|burgundy|margaux)/.test(value)) return "wine";
  if (/(art|painting|canvas|artist|print)/.test(value)) return "art";
  return "other";
}

export function mockMarketSearch(query: string): MarketSearchResult[] {
  const category = inferCategory(query);
  const normalized = query.trim() || "Collectible Asset";
  const presets: Record<Category, Array<{ title: string; price: number; condition: string; soldCount: number }>> = {
    watches: [
      { title: `${normalized} full set excellent condition`, price: 14800, condition: "Excellent", soldCount: 21 },
      { title: `${normalized} box and papers`, price: 15450, condition: "Near Mint", soldCount: 14 },
      { title: `${normalized} recently serviced`, price: 13900, condition: "Very Good", soldCount: 8 }
    ],
    sneakers: [
      { title: `${normalized} DS Size 10`, price: 340, condition: "Deadstock", soldCount: 63 },
      { title: `${normalized} authenticated Size 10.5`, price: 318, condition: "New", soldCount: 42 },
      { title: `${normalized} lightly worn`, price: 245, condition: "Used", soldCount: 18 }
    ],
    trading_cards: [
      { title: `${normalized} PSA 10`, price: 8200, condition: "PSA 10", soldCount: 47 },
      { title: `${normalized} PSA 9`, price: 4150, condition: "PSA 9", soldCount: 39 },
      { title: `${normalized} raw near mint`, price: 880, condition: "Near Mint", soldCount: 52 }
    ],
    wine: [
      { title: `${normalized} professionally stored bottle`, price: 4100, condition: "Cellared", soldCount: 9 },
      { title: `${normalized} original wooden case`, price: 24600, condition: "OWC", soldCount: 5 },
      { title: `${normalized} single owner provenance`, price: 3950, condition: "Excellent fill", soldCount: 7 }
    ],
    art: [
      { title: `${normalized} signed original`, price: 38500, condition: "Excellent", soldCount: 3 },
      { title: `${normalized} gallery provenance`, price: 37200, condition: "Excellent", soldCount: 2 },
      { title: `${normalized} study on paper`, price: 9800, condition: "Good", soldCount: 4 }
    ],
    spirits: [],
    jewelry: [],
    books: [],
    coins: [],
    vintage_clothing: [],
    cars: [],
    guitars: [],
    furniture: [],
    other: [
      { title: `${normalized} comparable sale`, price: 2400, condition: "Excellent", soldCount: 12 },
      { title: `${normalized} verified provenance`, price: 2850, condition: "Near Mint", soldCount: 7 },
      { title: `${normalized} recent market comp`, price: 2100, condition: "Very Good", soldCount: 5 }
    ]
  };

  const rows = presets[category].length ? presets[category] : presets.other;
  return rows.map((row, index) => ({
    id: `mock-${category}-${index}-${normalized.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: row.title,
    category,
    price: row.price,
    source: "VAULT market model",
    confidence: row.soldCount > 20 ? "High" : row.soldCount > 5 ? "Medium" : "Low",
    soldCount: row.soldCount,
    condition: row.condition,
    priceLow: Math.round(row.price * 0.88),
    priceHigh: Math.round(row.price * 1.12),
    avgPrice: row.price,
    lastSalePrice: row.price,
    lastSaleDate: new Date(Date.now() - (index + 2) * 24 * 60 * 60 * 1000).toISOString(),
    priceConfidence: row.soldCount > 20 ? "HIGH" : row.soldCount > 5 ? "MEDIUM" : "LOW",
    marketStatus: "mock"
  }));
}

export function mockSoldListings(query: string, category: Category): EbaySoldListing[] {
  const base = mockMarketSearch(query).find((result) => result.category === category) ?? mockMarketSearch(query)[0];
  const prices = Array.from({ length: Math.min(20, Math.max(5, base.soldCount ?? 8)) }, (_, index) => {
    const wave = Math.sin(index * 1.7) * 0.06;
    const drift = (index - 8) * 0.004;
    return Math.round(base.price * (1 + wave + drift));
  });
  return prices.map((price, index) => ({
    itemId: `mock-sold-${index}-${query.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    title: `${base.title} sold comp ${index + 1}`,
    price,
    soldAt: new Date(Date.now() - index * 5 * 24 * 60 * 60 * 1000).toISOString(),
    imageUrl: base.imageUrl,
    condition: base.condition,
    url: base.url
  }));
}

export function summarizeMarketValue(results: MarketSearchResult[]) {
  if (!results.length) return { estimate: 0, confidence: "Low" as const, sales: 0 };
  const prices = results.map((result) => result.price).sort((a, b) => a - b);
  const estimate = prices[Math.floor(prices.length / 2)];
  const sales = results.reduce((sum, result) => sum + (result.soldCount ?? 0), 0);
  return {
    estimate,
    confidence: sales > 30 ? "High" as const : sales > 8 ? "Medium" as const : "Low" as const,
    sales
  };
}
