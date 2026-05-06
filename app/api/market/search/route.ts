import { NextResponse } from "next/server";
import { searchPriceCharting } from "@/lib/pricecharting";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? 5), 5);

  if (!query) {
    return NextResponse.json({
      results: [],
      valuation: { marketValue: null, priceLow: null, priceHigh: null, avgPrice: null, sampleSize: 0, lastSalePrice: null, lastSaleDate: null, confidence: "NONE" },
      source: "empty"
    });
  }

  try {
    const payload = await searchPriceCharting(query, limit);
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
