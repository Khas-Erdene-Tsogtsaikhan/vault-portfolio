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
    const payloads = await readCsvPayloads(request);
    let upserted = 0;
    let rowsSeen = 0;
    let rowsFailed = 0;
    const failures: Array<{ source: string; row?: number; reason: string }> = [];

    for (const payload of payloads) {
      try {
        const parsed = parsePriceChartingCsv(payload.csv);
        rowsSeen += parsed.rowsSeen;
        rowsFailed += parsed.failures.length;
        failures.push(...parsed.failures.slice(0, 5).map((failure) => ({ source: payload.source, ...failure })));

        for (let index = 0; index < parsed.rows.length; index += batchSize) {
          const batch = parsed.rows.slice(index, index + batchSize);
          const { error } = await supabaseAdmin
            .from("pricecharting_catalog")
            .upsert(batch, { onConflict: "pricecharting_id" });
          if (error) throw error;
          upserted += batch.length;
        }
      } catch (error) {
        rowsFailed += 1;
        failures.push({ source: payload.source, reason: error instanceof Error ? error.message : "CSV source failed." });
      }
    }

    if (!upserted && failures.length) throw new Error(failures.map((failure) => `${failure.source}: ${failure.reason}`).join("\n"));

    await supabaseAdmin.from("catalog_sync_runs").update({
      status: "completed",
      rows_seen: rowsSeen,
      rows_upserted: upserted,
      rows_failed: rowsFailed,
      error_message: failures.slice(0, 8).map((failure) => `${failure.source}${failure.row ? ` row ${failure.row}` : ""}: ${failure.reason}`).join("\n") || null,
      completed_at: new Date().toISOString()
    }).eq("id", run.data.id);

    return NextResponse.json({
      status: "completed",
      sources: payloads.map((payload) => payload.source),
      rowsSeen,
      rowsUpserted: upserted,
      rowsFailed,
      sampleFailures: failures.slice(0, 8)
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

async function readCsvPayloads(request: Request): Promise<Array<{ source: string; csv: string }>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    if (file instanceof File) return [{ source: file.name || "uploaded-file", csv: await file.text() }];
    const csvUrl = form.get("csvUrl");
    if (typeof csvUrl === "string" && csvUrl) return fetchCsvUrls(splitCsvUrls(csvUrl));
  }

  if (contentType.includes("application/json")) {
    const body = await request.json() as { csvUrl?: string; csvUrls?: string[] | string };
    const urls = [
      ...splitCsvUrls(body.csvUrl),
      ...(Array.isArray(body.csvUrls) ? body.csvUrls.flatMap(splitCsvUrls) : splitCsvUrls(body.csvUrls))
    ];
    if (urls.length) return fetchCsvUrls(urls);
  }

  const envUrls = [
    ...splitCsvUrls(process.env.PRICECHARTING_CSV_URLS),
    ...splitCsvUrls(process.env.PRICECHARTING_CSV_URL)
  ];
  if (envUrls.length) return fetchCsvUrls(envUrls);

  const raw = await request.text();
  if (raw.trim()) return [{ source: "raw-body", csv: raw }];
  throw new Error("Provide a CSV file, raw CSV body, csvUrl/csvUrls, PRICECHARTING_CSV_URLS, or PRICECHARTING_CSV_URL.");
}

async function fetchCsvUrls(urls: string[]) {
  const payloads = [];
  for (const url of urls) {
    payloads.push({ source: redactUrl(url), csv: await fetchCsv(url) });
  }
  return payloads;
}

async function fetchCsv(url: string) {
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`CSV download failed with ${response.status} for ${redactUrl(url)}.`);
  return response.text();
}

function splitCsvUrls(value: string | undefined | null) {
  return (value ?? "")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

function redactUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.search) parsed.search = "?...";
    return parsed.toString();
  } catch {
    return url.slice(0, 80);
  }
}
