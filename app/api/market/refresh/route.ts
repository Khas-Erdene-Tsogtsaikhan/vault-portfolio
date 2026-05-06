import { NextResponse } from "next/server";
import { refreshPriceChartingProduct } from "@/lib/pricecharting";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return runRefresh(request);
}

export async function POST(request: Request) {
  return runRefresh(request);
}

async function runRefresh(request: Request) {
  const secret = process.env.MARKET_REFRESH_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (secret && provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Set SUPABASE_SERVICE_ROLE_KEY to run refresh jobs." }, { status: 501 });

  const { data, error } = await supabaseAdmin
    .from("items")
    .select("id,user_id,pricecharting_id,pricecharting_price_field,current_value_user,high_52w")
    .not("pricecharting_id", "is", null)
    .eq("is_sold", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const unique = new Map<string, typeof data[number]>();
  for (const item of data ?? []) {
    const key = `${item.pricecharting_id}:${item.pricecharting_price_field ?? "auto"}`;
    if (!unique.has(key)) unique.set(key, item);
  }

  const refreshed = new Map<string, Awaited<ReturnType<typeof refreshPriceChartingProduct>>>();
  const failures = [];
  for (const item of Array.from(unique.values())) {
    try {
      const result = await refreshPriceChartingProduct({
        id: item.id,
        pricechartingId: item.pricecharting_id,
        pricechartingPriceField: item.pricecharting_price_field,
        currentValueUser: Number(item.current_value_user ?? 0)
      });
      refreshed.set(`${item.pricecharting_id}:${item.pricecharting_price_field ?? "auto"}`, result);
    } catch (error) {
      failures.push({ itemId: item.id, error: error instanceof Error ? error.message : "Unknown refresh error" });
    }
  }

  const now = new Date().toISOString();
  for (const item of data ?? []) {
    const result = refreshed.get(`${item.pricecharting_id}:${item.pricecharting_price_field ?? "auto"}`);
    if (!result) continue;
    await supabaseAdmin.from("items").update({
      current_value_market: result.price,
      current_value_user: result.price,
      current_value_source: "PriceCharting Guide Value",
      current_value_updated_at: now,
      price_low: result.priceLow ?? null,
      price_high: result.priceHigh ?? null,
      last_sale_price: result.lastSalePrice ?? result.price,
      last_sale_date: result.lastSaleDate ?? now,
      price_sample_size: result.soldCount ?? null,
      price_confidence: result.priceConfidence ?? "LOW",
      pricecharting_console: result.pricechartingConsole ?? null,
      pricecharting_last_sync_at: now,
      updated_at: now
    }).eq("id", item.id);
    await supabaseAdmin.from("price_history").insert({
      item_id: item.id,
      value: result.price,
      source: "market",
      sample_size: result.soldCount ?? null,
      price_low: result.priceLow ?? null,
      price_high: result.priceHigh ?? null,
      source_detail: "pricecharting_api",
      recorded_at: now
    });
  }

  return NextResponse.json({ trackedItems: data?.length ?? 0, uniquePricechartingProducts: unique.size, failures });
}
