import { NextResponse } from "next/server";
import { searchMarketItems } from "@/lib/market-search";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { query?: string; category?: string; limit?: number };
  const query = body.query?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ results: [], total: 0, source: "empty" });

  const payload = await searchMarketItems(query, Math.min(body.limit ?? 50, 100), body.category);
  return NextResponse.json({ ...payload, total: payload.total ?? payload.results.length });
}
