import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { Meilisearch } from "meilisearch";
import type { Task } from "meilisearch";
import { pricechartingIndexName } from "../lib/meilisearch";
import { normalizePriceKey } from "../lib/pricecharting";

const batchSize = Number(process.env.MEILI_PRICE_SYNC_BATCH_SIZE ?? 5000);

interface PriceUpdateDocument {
  id: string;
  pricecharting_id: string;
  loose_price?: number | null;
  cib_price?: number | null;
  new_price?: number | null;
  graded_price?: number | null;
  psa_10_price?: number | null;
  box_only_price?: number | null;
  manual_only_price?: number | null;
  sales_volume?: number;
  has_loose_price?: boolean;
  has_graded_price?: boolean;
  has_new_price?: boolean;
  price_fields: Record<string, number>;
  last_synced_at: string;
}

async function main() {
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_MASTER_KEY;
  if (!host || !apiKey) throw new Error("Set MEILI_HOST and MEILI_MASTER_KEY.");

  const sources = getSources();
  if (!sources.length) {
    throw new Error("Set PRICECHARTING_CSV_URL, PRICECHARTING_CSV_URLS, PC_CSV_URL_1..PC_CSV_URL_12, or pass CSV file paths as CLI args.");
  }

  const client = new Meilisearch({ host, apiKey });
  const index = client.index(pricechartingIndexName);
  let total = 0;

  console.log(`Found ${sources.length} CSV source${sources.length === 1 ? "" : "s"} for price-only sync.`);
  for (const source of sources) {
    console.log(`Processing ${source.label}...`);
    const count = await ingestSource({ client, index, source });
    total += count;
    console.log(`Updated ${count.toLocaleString()} product price documents from ${source.label}`);
  }

  const stats = await index.getStats();
  console.log(`Catalog price sync complete. ${total.toLocaleString()} rows processed; ${stats.numberOfDocuments.toLocaleString()} documents searchable.`);
  if (total === 0) throw new Error("Price sync produced 0 valid rows. Check the CSV URL secrets.");
}

async function ingestSource({
  client,
  index,
  source
}: {
  client: Meilisearch;
  index: ReturnType<Meilisearch["index"]>;
  source: CsvSource;
}) {
  const parser = parse({ columns: (headers: string[]) => headers.map(normalizeHeader), skip_empty_lines: true, relax_column_count: true, trim: true });
  const input = await openSource(source);
  input.pipe(parser);

  let count = 0;
  let seenRows = 0;
  let firstRowKeys: string[] = [];
  let batch: PriceUpdateDocument[] = [];

  for await (const row of parser as AsyncIterable<Record<string, string>>) {
    seenRows += 1;
    if (!firstRowKeys.length) {
      firstRowKeys = Object.keys(row);
      console.log(`  ${source.label}: detected CSV columns: ${firstRowKeys.slice(0, 16).join(", ")}${firstRowKeys.length > 16 ? ", ..." : ""}`);
    }

    const document = csvRowToPriceUpdate(row);
    if (!document) continue;
    batch.push(document);

    if (batch.length >= batchSize) {
      count += await flushBatch(client, index, batch);
      console.log(`  ${source.label}: ${count.toLocaleString()} updated`);
      batch = [];
    }
  }

  if (batch.length) count += await flushBatch(client, index, batch);
  if (count === 0) {
    throw new Error(`${source.label} produced 0 valid PriceCharting product rows from ${seenRows.toLocaleString()} CSV row${seenRows === 1 ? "" : "s"}. First columns: ${firstRowKeys.join(", ") || "none"}.`);
  }
  return count;
}

function csvRowToPriceUpdate(row: Record<string, string>): PriceUpdateDocument | null {
  const pricechartingId = field(row, "id") || field(row, "pricecharting-id") || field(row, "product-id");
  if (!pricechartingId) return null;

  const priceFields = collectPriceFields(row);
  const loose = priceFields["loose-price"] ?? null;
  const graded = priceFields["graded-price"] ?? null;
  const nextNew = priceFields["new-price"] ?? null;

  return {
    id: `pc_${pricechartingId}`,
    pricecharting_id: pricechartingId,
    loose_price: loose,
    cib_price: priceFields["cib-price"] ?? null,
    new_price: nextNew,
    graded_price: graded,
    psa_10_price: priceFields["manual-only-price"] ?? null,
    box_only_price: priceFields["box-only-price"] ?? null,
    manual_only_price: priceFields["manual-only-price"] ?? null,
    sales_volume: integerField(row, "sales-volume"),
    has_loose_price: Boolean(loose),
    has_graded_price: Boolean(graded),
    has_new_price: Boolean(nextNew),
    price_fields: priceFields,
    last_synced_at: new Date().toISOString()
  };
}

async function flushBatch(client: Meilisearch, index: ReturnType<Meilisearch["index"]>, batch: PriceUpdateDocument[]) {
  const task = await index.updateDocuments(batch, { primaryKey: "id" });
  const completed = await client.tasks.waitForTask(task.taskUid, { timeout: 10 * 60 * 1000 });
  assertTaskSucceeded(completed, `price update batch ${task.taskUid}`);
  return batch.length;
}

function collectPriceFields(row: Record<string, string>) {
  const fields: Record<string, number> = {};
  for (const [key, raw] of Object.entries(row)) {
    if (!key.endsWith("-price")) continue;
    const cents = parseCents(raw);
    if (cents > 0) fields[key] = cents;
  }
  return fields;
}

function assertTaskSucceeded(task: Task, label: string) {
  if (task.status === "succeeded") return;
  const detail = task.error ? `${task.error.code}: ${task.error.message}` : `status=${task.status}`;
  throw new Error(`Meilisearch ${label} failed: ${detail}`);
}

async function openSource(source: CsvSource) {
  if (source.url) {
    const response = await fetch(source.url);
    if (!response.ok || !response.body) throw new Error(`Could not download ${source.label}: ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "unknown";
    const contentLength = response.headers.get("content-length") ?? "unknown";
    console.log(`  ${source.label}: download ok (${contentType}, ${contentLength} bytes)`);
    return Readable.fromWeb(response.body as any);
  }
  return createReadStream(source.path as string);
}

interface CsvSource {
  label: string;
  url?: string;
  path?: string;
}

function getSources(): CsvSource[] {
  const cli = process.argv.slice(2).map((path) => ({ path, label: path }));
  if (cli.length) return cli;

  const envUrls = [
    ...splitUrls(process.env.PRICECHARTING_CSV_URL),
    ...splitUrls(process.env.PRICECHARTING_CSV_URLS),
    ...Array.from({ length: 12 }, (_, index) => process.env[`PC_CSV_URL_${index + 1}`]).flatMap(splitUrls)
  ];
  if (envUrls.length) return envUrls.map((url) => ({ url, label: redactUrl(url) }));

  const local = [
    "data/pokemon.csv",
    "data/sports-cards.csv",
    "data/video-games.csv",
    "data/magic.csv",
    "data/comics.csv",
    "data/coins.csv",
    "data/other.csv"
  ].filter(existsSync);
  return local.map((path) => ({ path, label: path }));
}

function splitUrls(value: string | undefined | null) {
  return (value ?? "")
    .split(/[\n,]+/)
    .map((url) => url.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function field(row: Record<string, string>, name: string) {
  return row[name]?.trim() || row[normalizePriceKey(name)]?.trim() || "";
}

function integerField(row: Record<string, string>, name: string) {
  const parsed = Number(field(row, name).replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function parseCents(raw: string) {
  const clean = raw?.replace(/[$,]/g, "").trim();
  if (!clean) return 0;
  const number = Number(clean);
  if (!Number.isFinite(number)) return 0;
  return clean.includes(".") ? Math.round(number * 100) : Math.round(number);
}

function normalizeHeader(header: string) {
  return header.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function redactUrl(value: string) {
  try {
    const url = new URL(value);
    url.search = url.search ? "?..." : "";
    return url.toString();
  } catch {
    return value.slice(0, 80);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
