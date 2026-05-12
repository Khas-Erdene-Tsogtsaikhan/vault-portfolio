import { Meilisearch } from "meilisearch";

export const pricechartingIndexName = "pricecharting_products";

export function getMeiliAdminClient() {
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_MASTER_KEY;
  if (!host || !apiKey) return null;
  return new Meilisearch({ host, apiKey });
}

export function getMeiliSearchClient() {
  const host = process.env.MEILI_HOST;
  const apiKey = process.env.MEILI_SEARCH_KEY ?? process.env.MEILI_MASTER_KEY;
  if (!host || !apiKey) return null;
  return new Meilisearch({ host, apiKey });
}

export async function configurePriceChartingIndex() {
  const client = getMeiliAdminClient();
  if (!client) throw new Error("Set MEILI_HOST and MEILI_MASTER_KEY before configuring Meilisearch.");
  const index = client.index(pricechartingIndexName);
  const task = await index.updateSettings({
    searchableAttributes: ["product_name", "console_name", "category", "brand"],
    filterableAttributes: ["category", "console_name", "has_graded_price", "has_loose_price", "has_new_price"],
    sortableAttributes: ["sales_volume", "loose_price", "graded_price", "new_price"],
    displayedAttributes: ["*"],
    rankingRules: ["words", "typo", "proximity", "attribute", "exactness", "sales_volume:desc"],
    synonyms: {
      figure: ["figures", "figurine", "figurines", "statue", "statues", "action figure", "collectible figure"],
      figures: ["figure", "figurine", "figurines", "statue", "statues", "action figures", "collectible figures"],
      figurine: ["figure", "figures", "figurines", "statue", "statues", "action figure"],
      figurines: ["figure", "figures", "figurine", "statue", "statues", "action figures"],
      statue: ["statues", "figure", "figures", "figurine", "figurines"],
      statues: ["statue", "figure", "figures", "figurine", "figurines"],
      toy: ["toys", "figure", "figures", "figurine", "figurines"],
      toys: ["toy", "figure", "figures", "figurine", "figurines"],
      funko: ["pop", "funko pop", "vinyl figure"],
      amiibo: ["figure", "figurine", "nintendo figure"]
    },
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: {
        oneTypo: 4,
        twoTypos: 8
      }
    }
  });
  await client.tasks.waitForTask(task.taskUid);
}
