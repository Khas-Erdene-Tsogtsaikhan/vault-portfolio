import { NextResponse } from "next/server";
import { searchMarketItems } from "@/lib/market-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const category = searchParams.get("category")?.trim() || undefined;

  if (!query) {
    return NextResponse.json({
      results: [],
      valuation: { marketValue: null, priceLow: null, priceHigh: null, avgPrice: null, sampleSize: 0, lastSalePrice: null, lastSaleDate: null, confidence: "NONE" },
      source: "empty"
    });
  }

  try {
    const payload = await searchMarketItems(query, limit, category);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({
      results: [],
      valuation: { marketValue: null, priceLow: null, priceHigh: null, avgPrice: null, sampleSize: 0, lastSalePrice: null, lastSaleDate: null, confidence: "NONE" },
      source: "pricecharting_error",
      note: error instanceof Error ? error.message : "PriceCharting lookup failed."
    }, { status: 200 });
  }
}
