import { NextResponse } from "next/server";
import { refreshPriceChartingProduct } from "@/lib/pricecharting";
import { getTier } from "@/lib/portfolio-utils";
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
    .select("id,user_id,name,pricecharting_id,pricecharting_price_field,current_value_user,current_value_market,cost_basis,high_52w,low_52w,is_sold")
    .not("pricecharting_id", "is", null)
    .eq("is_sold", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items = data ?? [];
  const unique = new Map<string, typeof items[number]>();
  for (const item of items) {
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
  const snapshotDate = now.slice(0, 10);
  let refreshedItems = 0;
  const affectedUsers = new Set<string>();

  for (const item of items) {
    const result = refreshed.get(`${item.pricecharting_id}:${item.pricecharting_price_field ?? "auto"}`);
    if (!result) continue;

    const previousValue = Number(item.current_value_market ?? item.current_value_user ?? 0);
    const nextValue = result.price;
    const delta = nextValue - previousValue;
    const deltaPct = previousValue > 0 ? delta / previousValue : 0;
    const high52w = Math.max(Number(item.high_52w ?? 0), nextValue, previousValue);
    const lowCandidates = [Number(item.low_52w ?? 0), nextValue, previousValue].filter((value) => value > 0);
    const low52w = lowCandidates.length ? Math.min(...lowCandidates) : nextValue;

    await supabaseAdmin.from("items").update({
      current_value_market: nextValue,
      current_value_user: nextValue,
      current_value_source: "PriceCharting Guide Value",
      current_value_updated_at: now,
      value_24h_ago: previousValue,
      high_52w: high52w,
      low_52w: low52w,
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

    await supabaseAdmin.from("item_price_snapshots").upsert({
      item_id: item.id,
      user_id: item.user_id,
      pricecharting_id: item.pricecharting_id,
      condition_field: item.pricecharting_price_field ?? result.pricechartingPriceField ?? null,
      value: nextValue,
      previous_value: previousValue,
      delta,
      delta_pct: deltaPct,
      source: result.source === "PriceCharting Guide Value" ? "pricecharting_catalog" : "pricecharting_api",
      snapshot_date: snapshotDate
    }, { onConflict: "item_id,snapshot_date" });

    await supabaseAdmin.from("price_history").insert({
      item_id: item.id,
      value: nextValue,
      source: "market",
      sample_size: result.soldCount ?? null,
      price_low: result.priceLow ?? null,
      price_high: result.priceHigh ?? null,
      source_detail: "pricecharting_daily_snapshot",
      recorded_at: now
    });

    await maybeQueueItemNotifications(item, nextValue, previousValue, deltaPct, high52w, now);
    affectedUsers.add(item.user_id);
    refreshedItems += 1;
  }

  const portfolioResults = [];
  for (const userId of Array.from(affectedUsers)) {
    portfolioResults.push(await writePortfolioSnapshotAndDigest(userId, snapshotDate, now));
  }

  return NextResponse.json({
    trackedItems: items.length,
    refreshedItems,
    uniquePricechartingProducts: unique.size,
    affectedUsers: affectedUsers.size,
    portfolios: portfolioResults,
    failures
  });
}

async function maybeQueueItemNotifications(item: any, nextValue: number, previousValue: number, deltaPct: number, high52w: number, now: string) {
  if (!supabaseAdmin || previousValue <= 0) return;
  const today = now.slice(0, 10);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("notify_price_ath,notify_price_up_pct,notify_price_down_pct,notify_market_moves")
    .eq("id", item.user_id)
    .maybeSingle();

  const { data: existing } = await supabaseAdmin
    .from("notification_events")
    .select("id,type")
    .eq("user_id", item.user_id)
    .eq("item_id", item.id)
    .gte("created_at", `${today}T00:00:00.000Z`);

  const already = new Set((existing ?? []).map((event) => event.type));
  const events = [];
  const pct = deltaPct * 100;
  const totalReturnPct = Number(item.cost_basis ?? 0) > 0 ? ((nextValue - Number(item.cost_basis)) / Number(item.cost_basis)) * 100 : 0;

  if (profile?.notify_price_ath !== false && nextValue >= high52w && nextValue > previousValue && !already.has("ATH")) {
    events.push(notification(item.user_id, "ATH", "New all-time high", `Your ${item.name} just hit ${money(nextValue)} - a new VAULT high. Up ${Math.round(totalReturnPct)}% from what you paid.`, item.id, "high", now));
  }
  if (profile?.notify_market_moves !== false && pct >= Number(profile?.notify_price_up_pct ?? 10) && !already.has("PRICE_UP")) {
    events.push(notification(item.user_id, "PRICE_UP", `${item.name} up ${Math.round(pct)}% today`, `${item.name} moved ${money(nextValue - previousValue)} overnight after the latest PriceCharting sync. Current guide value: ${money(nextValue)}.`, item.id, "medium", now));
  }
  if (profile?.notify_market_moves !== false && pct <= -Number(profile?.notify_price_down_pct ?? 15) && !already.has("PRICE_DOWN")) {
    events.push(notification(item.user_id, "PRICE_DOWN", `${item.name} dipped ${Math.abs(Math.round(pct))}% today`, `${item.name} moved down ${money(Math.abs(nextValue - previousValue))} after the latest PriceCharting sync. Long-term holders often see temporary dips recover.`, item.id, "medium", now));
  }

  if (events.length) await supabaseAdmin.from("notification_events").insert(events.slice(0, 2));
}

async function writePortfolioSnapshotAndDigest(userId: string, snapshotDate: string, now: string) {
  if (!supabaseAdmin) return null;
  const { data: items, error } = await supabaseAdmin
    .from("items")
    .select("id,name,current_value_market,current_value_user,cost_basis")
    .eq("user_id", userId)
    .eq("is_sold", false);
  if (error) return { userId, error: error.message };

  const totalValue = (items ?? []).reduce((sum, item) => sum + Number(item.current_value_market ?? item.current_value_user ?? 0), 0);
  const totalCostBasis = (items ?? []).reduce((sum, item) => sum + Number(item.cost_basis ?? 0), 0);
  const totalGain = totalValue - totalCostBasis;
  const totalGainPct = totalCostBasis > 0 ? totalGain / totalCostBasis : 0;

  const { data: previous } = await supabaseAdmin
    .from("portfolio_snapshots")
    .select("total_value")
    .eq("user_id", userId)
    .lt("snapshot_date", snapshotDate)
    .order("snapshot_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousValue = Number(previous?.total_value ?? totalValue);
  const dailyDelta = totalValue - previousValue;
  const dailyDeltaPct = previousValue > 0 ? dailyDelta / previousValue : 0;

  console.log("Writing snapshot:", {
    userId,
    totalValue,
    itemCount: items?.length ?? 0,
    items: (items ?? []).map((item) => ({
      name: item.name,
      value: Number(item.current_value_market ?? item.current_value_user ?? 0),
      cost: Number(item.cost_basis ?? 0)
    }))
  });

  await supabaseAdmin.from("portfolio_snapshots").upsert({
    user_id: userId,
    snapshot_date: snapshotDate,
    total_value: totalValue,
    total_cost_basis: totalCostBasis,
    total_gain: totalGain,
    total_gain_pct: totalGainPct,
    daily_delta: dailyDelta,
    daily_delta_pct: dailyDeltaPct,
    item_count: items?.length ?? 0
  }, { onConflict: "user_id,snapshot_date" });

  await supabaseAdmin.from("profiles").update({
    total_items: items?.length ?? 0,
    total_value_cached: totalValue,
    total_cost_basis_cached: totalCostBasis,
    tier: getTier(totalValue),
    last_active_at: now
  }).eq("id", userId);

  await maybeQueuePortfolioDigest(userId, totalValue, dailyDelta, dailyDeltaPct, now);
  return { userId, totalValue, dailyDelta, dailyDeltaPct };
}

async function maybeQueuePortfolioDigest(userId: string, totalValue: number, dailyDelta: number, dailyDeltaPct: number, now: string) {
  if (!supabaseAdmin || dailyDelta === 0) return;
  const today = now.slice(0, 10);
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("notify_market_moves,notify_digest_daily")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.notify_market_moves === false && profile?.notify_digest_daily !== true) return;

  const { data: existing } = await supabaseAdmin
    .from("notification_events")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "MARKET_MOVE")
    .gte("created_at", `${today}T00:00:00.000Z`)
    .limit(1);
  if (existing?.length) return;

  const direction = dailyDelta >= 0 ? "increased" : "moved";
  const title = `Your Vault ${direction} ${dailyDelta >= 0 ? "+" : "-"}${money(Math.abs(dailyDelta))}`;
  const body = `Your portfolio is now ${money(totalValue)}, ${dailyDelta >= 0 ? "up" : "down"} ${money(Math.abs(dailyDelta))} (${formatPct(dailyDeltaPct)}) after today's PriceCharting guide sync.`;
  await supabaseAdmin.from("notification_events").insert(notification(userId, "MARKET_MOVE", title, body, undefined, "medium", now));
}

function notification(userId: string, type: string, title: string, body: string, itemId: string | undefined, priority: string, createdAt: string) {
  return {
    user_id: userId,
    type,
    title,
    body,
    item_id: itemId ?? null,
    priority,
    channel: "in_app",
    status: "queued",
    created_at: createdAt
  };
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatPct(value: number) {
  const percent = value * 100;
  return `${percent >= 0 ? "+" : ""}${percent.toFixed(2)}%`;
}
