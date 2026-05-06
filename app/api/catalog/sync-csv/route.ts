import { NextResponse } from "next/server";
import { parsePriceChartingCsv } from "@/lib/pricecharting-catalog-sync";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

const batchSize = 750;

export async function POST(request: Request) {
  const secret = process.env.MARKET_REFRESH_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (secret && provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Set SUPABASE_SERVICE_ROLE_KEY to sync the catalog." }, { status: 501 });

  const run = await supabaseAdmin.from("catalog_sync_runs").insert({
    source: "pricecharting_csv",
    status: "running"
  }).select("id").single();
  if (run.error) return NextResponse.json({ error: run.error.message }, { status: 500 });

  try {
    const csv = await readCsvPayload(request);
    const parsed = parsePriceChartingCsv(csv);
    let upserted = 0;

    for (let index = 0; index < parsed.rows.length; index += batchSize) {
      const batch = parsed.rows.slice(index, index + batchSize);
      const { error } = await supabaseAdmin
        .from("pricecharting_catalog")
        .upsert(batch, { onConflict: "pricecharting_id" });
      if (error) throw error;
      upserted += batch.length;
    }

    await supabaseAdmin.from("catalog_sync_runs").update({
      status: "completed",
      rows_seen: parsed.rowsSeen,
      rows_upserted: upserted,
      rows_failed: parsed.failures.length,
      error_message: parsed.failures.slice(0, 5).map((failure) => `row ${failure.row}: ${failure.reason}`).join("\n") || null,
      completed_at: new Date().toISOString()
    }).eq("id", run.data.id);

    return NextResponse.json({
      status: "completed",
      rowsSeen: parsed.rowsSeen,
      rowsUpserted: upserted,
      rowsFailed: parsed.failures.length,
      sampleFailures: parsed.failures.slice(0, 5)
    });
  } catch (error) {
    await supabaseAdmin.from("catalog_sync_runs").update({
      status: "failed",
      error_message: error instanceof Error ? error.message : "Catalog sync failed.",
      completed_at: new Date().toISOString()
    }).eq("id", run.data.id);

    return NextResponse.json({ error: error instanceof Error ? error.message : "Catalog sync failed." }, { status: 500 });
  }
}

async function readCsvPayload(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (file instanceof File) return file.text();
    const csvUrl = form.get("csvUrl");
    if (typeof csvUrl === "string" && csvUrl) return fetchCsv(csvUrl);
  }

  if (contentType.includes("application/json")) {
    const body = await request.json() as { csvUrl?: string };
    if (body.csvUrl) return fetchCsv(body.csvUrl);
  }

  const envUrl = process.env.PRICECHARTING_CSV_URL;
  if (envUrl) return fetchCsv(envUrl);

  const raw = await request.text();
  if (raw.trim()) return raw;
  throw new Error("Provide a CSV file, raw CSV body, csvUrl, or PRICECHARTING_CSV_URL.");
}

async function fetchCsv(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`CSV download failed with ${response.status}.`);
  return response.text();
}
