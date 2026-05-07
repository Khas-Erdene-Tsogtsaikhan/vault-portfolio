import { createReadStream, existsSync } from "node:fs";
import { Readable } from "node:stream";
import { parse } from "csv-parse";
import { Meilisearch } from "meilisearch";
import type { Task } from "meilisearch";
import { csvRowToSearchDocument, type PriceChartingSearchDocument } from "../lib/pricecharting-documents";
import { pricechartingIndexName } from "../lib/meilisearch";

const batchSize = Number(process.env.MEILI_BATCH_SIZE ?? 5000);

async function main() {
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_MASTER_KEY;
  if (!host || !apiKey) throw new Error("Set MEILI_HOST and MEILI_MASTER_KEY.");

  const sources = getSources();
  if (!sources.length) {
    throw new Error("Set PRICECHARTING_CSV_URL, PRICECHARTING_CSV_URLS, PC_CSV_URL_1..PC_CSV_URL_12, or pass CSV file paths as CLI args.");
  }
  console.log(`Found ${sources.length} CSV source${sources.length === 1 ? "" : "s"} to index.`);

  const client = new Meilisearch({ host, apiKey });
  const index = client.index<PriceChartingSearchDocument>(pricechartingIndexName);
  await configureIndex(client);

  let total = 0;
  for (const source of sources) {
    console.log(`Processing ${source.label}...`);
    const count = await ingestSource({ client, index, source });
    total += count;
    console.log(`Indexed ${count.toLocaleString()} products from ${source.label}`);
  }

  const stats = await waitForDocumentStats(index);
  console.log(`Seed complete. ${stats.numberOfDocuments.toLocaleString()} documents searchable. ${total.toLocaleString()} rows processed this run.`);
  if (total === 0 || stats.numberOfDocuments === 0) {
    throw new Error("Meilisearch catalog sync produced 0 searchable products. Check that your GitHub CSV URL secrets point to real PriceCharting CSV files, not an HTML page, expired URL, or empty file.");
  }
}

async function configureIndex(client: Meilisearch) {
  const index = client.index(pricechartingIndexName);
  const task = await index.updateSettings({
    searchableAttributes: ["product_name", "console_name", "category", "brand"],
    filterableAttributes: ["category", "console_name", "has_graded_price", "has_loose_price", "has_new_price"],
    sortableAttributes: ["sales_volume", "loose_price", "graded_price", "new_price"],
    displayedAttributes: ["*"],
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8
      }
    }
  });
  const completed = await client.tasks.waitForTask(task.taskUid);
  assertTaskSucceeded(completed, "index settings update");
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
  let skippedRows = 0;
  let firstRowKeys: string[] = [];
  let batch: PriceChartingSearchDocument[] = [];

  for await (const row of parser as AsyncIterable<Record<string, string>>) {
    seenRows += 1;
    if (!firstRowKeys.length) {
      firstRowKeys = Object.keys(row);
      console.log(`  ${source.label}: detected CSV columns: ${firstRowKeys.slice(0, 16).join(", ")}${firstRowKeys.length > 16 ? ", ..." : ""}`);
    }
    const document = csvRowToSearchDocument(row, source.category);
    if (!document) {
      skippedRows += 1;
      continue;
    }
    batch.push(document);
    if (batch.length >= batchSize) {
      count += await flushBatch(client, index, batch);
      console.log(`  ${source.label}: ${count.toLocaleString()} indexed`);
      batch = [];
    }
  }

  if (batch.length) count += await flushBatch(client, index, batch);
  if (count === 0) {
    throw new Error(`${source.label} produced 0 valid PriceCharting products from ${seenRows.toLocaleString()} CSV row${seenRows === 1 ? "" : "s"}. First columns: ${firstRowKeys.join(", ") || "none"}. This usually means the URL did not download the expected PriceCharting CSV.`);
  }
  if (skippedRows) {
    console.log(`  ${source.label}: skipped ${skippedRows.toLocaleString()} row${skippedRows === 1 ? "" : "s"} without product id/name.`);
  }
  return count;
}

async function flushBatch(client: Meilisearch, index: ReturnType<Meilisearch["index"]>, batch: PriceChartingSearchDocument[]) {
  const task = await index.addDocuments(batch, { primaryKey: "id" });
  const completed = await client.tasks.waitForTask(task.taskUid, { timeout: 10 * 60 * 1000 });
  assertTaskSucceeded(completed, `document batch ${task.taskUid}`);
  return batch.length;
}

function assertTaskSucceeded(task: Task, label: string) {
  if (task.status === "succeeded") return;
  const detail = task.error ? `${task.error.code}: ${task.error.message}` : `status=${task.status}`;
  throw new Error(`Meilisearch ${label} failed: ${detail}`);
}

async function waitForDocumentStats(index: ReturnType<Meilisearch["index"]>) {
  let stats = await index.getStats();
  for (let attempt = 0; attempt < 10 && stats.numberOfDocuments === 0; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    stats = await index.getStats();
  }
  return stats;
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
  category?: string;
  url?: string;
  path?: string;
}

function getSources(): CsvSource[] {
  const cli = process.argv.slice(2).map((path) => ({ path, label: path, category: inferCategory(path) }));
  if (cli.length) return cli;

  const envUrls = [
    ...splitUrls(process.env.PRICECHARTING_CSV_URL),
    ...splitUrls(process.env.PRICECHARTING_CSV_URLS),
    ...Array.from({ length: 12 }, (_, index) => process.env[`PC_CSV_URL_${index + 1}`]).flatMap(splitUrls)
  ];
  if (envUrls.length) return envUrls.map((url, index) => ({ url, label: redactUrl(url), category: inferCategory(url) }));

  const local = [
    "data/pokemon.csv",
    "data/sports-cards.csv",
    "data/video-games.csv",
    "data/magic.csv",
    "data/comics.csv",
    "data/coins.csv",
    "data/other.csv"
  ].filter(existsSync);
  return local.map((path) => ({ path, label: path, category: inferCategory(path) }));
}

function splitUrls(value: string | undefined | null) {
  return (value ?? "")
    .split(/[\n,]+/)
    .map((url) => url.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function inferCategory(value: string) {
  const normalized = value.toLowerCase();
  if (/pokemon|magic|yugioh|sports.*card|tcg|card/.test(normalized)) return "trading_cards";
  if (/video.*game|game|nintendo|playstation|xbox|sega/.test(normalized)) return "video_games";
  if (/comic/.test(normalized)) return "comics";
  if (/coin/.test(normalized)) return "coins";
  if (/funko/.test(normalized)) return "funko";
  if (/lego/.test(normalized)) return "lego";
  return undefined;
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
