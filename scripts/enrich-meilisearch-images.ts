import { Meilisearch } from "meilisearch";
import type { Task } from "meilisearch";
import { resolveCatalogImage } from "../lib/catalog-image-resolver";
import { pricechartingIndexName } from "../lib/meilisearch";
import type { PriceChartingSearchDocument } from "../lib/pricecharting-documents";

const scanBatchSize = Number(process.env.IMAGE_ENRICH_SCAN_BATCH ?? 500);
const updateBatchSize = Number(process.env.IMAGE_ENRICH_UPDATE_BATCH ?? 250);
const maxToEnrich = Number(process.env.IMAGE_ENRICH_LIMIT ?? process.argv[2] ?? 1000);
const delayMs = Number(process.env.IMAGE_ENRICH_DELAY_MS ?? 350);

async function main() {
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_MASTER_KEY;
  if (!host || !apiKey) throw new Error("Set MEILI_HOST and MEILI_MASTER_KEY.");
  if (maxToEnrich < 1) throw new Error("Set IMAGE_ENRICH_LIMIT to a positive number.");

  const client = new Meilisearch({ host, apiKey });
  const index = client.index<PriceChartingSearchDocument>(pricechartingIndexName);

  let offset = 0;
  let scanned = 0;
  let enriched = 0;
  let missed = 0;
  let updates: PriceChartingSearchDocument[] = [];

  console.log(`Starting image enrichment. Limit: ${maxToEnrich.toLocaleString()} products.`);

  while (enriched < maxToEnrich) {
    const page = await index.getDocuments<PriceChartingSearchDocument>({
      limit: scanBatchSize,
      offset,
      fields: ["id", "pricecharting_id", "product_name", "console_name", "category", "image_url", "image_source"]
    });
    if (!page.results.length) break;

    for (const document of page.results) {
      scanned += 1;
      if (document.image_url) continue;

      const resolution = await resolveCatalogImage(document);
      await sleep(delayMs);

      if (!resolution) {
        missed += 1;
        continue;
      }

      updates.push({ ...document, image_url: resolution.imageUrl, image_source: resolution.imageSource });
      enriched += 1;

      if (updates.length >= updateBatchSize) {
        await flushUpdates(client, index, updates);
        console.log(`  enriched ${enriched.toLocaleString()} images after scanning ${scanned.toLocaleString()} products (${missed.toLocaleString()} misses)`);
        updates = [];
      }

      if (enriched >= maxToEnrich) break;
    }

    offset += page.results.length;
    console.log(`Scanned ${scanned.toLocaleString()} products; enriched ${enriched.toLocaleString()}; next offset ${offset.toLocaleString()}.`);
  }

  if (updates.length) await flushUpdates(client, index, updates);
  console.log(`Image enrichment complete. Scanned ${scanned.toLocaleString()}, enriched ${enriched.toLocaleString()}, missed ${missed.toLocaleString()}.`);
}

async function flushUpdates(client: Meilisearch, index: ReturnType<Meilisearch["index"]>, documents: PriceChartingSearchDocument[]) {
  const task = await index.updateDocuments(documents, { primaryKey: "id" });
  const completed = await client.tasks.waitForTask(task.taskUid, { timeout: 10 * 60 * 1000 });
  assertTaskSucceeded(completed, `image update batch ${task.taskUid}`);
}

function assertTaskSucceeded(task: Task, label: string) {
  if (task.status === "succeeded") return;
  const detail = task.error ? `${task.error.code}: ${task.error.message}` : `status=${task.status}`;
  throw new Error(`Meilisearch ${label} failed: ${detail}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
