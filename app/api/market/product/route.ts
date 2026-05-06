import { NextResponse } from "next/server";
import { getPriceChartingProductResult } from "@/lib/pricecharting";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id")?.trim() ?? "";
  const query = searchParams.get("q")?.trim() ?? "";
  const field = searchParams.get("field")?.trim() || undefined;

  if (!id) {
    return NextResponse.json({
      results: [],
      valuation: { marketValue: null, priceLow: null, priceHigh: null, avgPrice: null, sampleSize: 0, lastSalePrice: null, lastSaleDate: null, confidence: "NONE" },
      source: "empty"
    }, { status: 400 });
  }

  try {
    const payload = await getPriceChartingProductResult(id, query, field);
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({
      results: [],
      valuation: { marketValue: null, priceLow: null, priceHigh: null, avgPrice: null, sampleSize: 0, lastSalePrice: null, lastSaleDate: null, confidence: "NONE" },
      source: "pricecharting_error",
      note: error instanceof Error ? error.message : "PriceCharting product lookup failed."
    }, { status: 200 });
  }
}
