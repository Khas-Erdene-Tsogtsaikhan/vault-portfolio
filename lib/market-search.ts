import { getMeiliSearchClient, pricechartingIndexName } from "@/lib/meilisearch";
import { searchDocumentToResult, type PriceChartingSearchDocument } from "@/lib/pricecharting-documents";
import { searchPriceCharting, type CachedPricePayload } from "@/lib/pricecharting";

export async function searchMarketItems(query: string, limit = 50, category?: string): Promise<CachedPricePayload & { total?: number }> {
  const meili = getMeiliSearchClient();
  if (meili && query.trim().length >= 2) {
    try {
      const index = meili.index(pricechartingIndexName);
      const response = await index.search<PriceChartingSearchDocument>(query, {
        limit: Math.max(1, Math.min(limit, 100)),
        filter: category && category !== "all" ? `category = "${escapeFilter(category)}"` : undefined,
        matchingStrategy: "last",
        attributesToRetrieve: [
          "id",
          "pricecharting_id",
          "product_name",
          "console_name",
          "category",
          "brand",
          "loose_price",
          "cib_price",
          "new_price",
          "graded_price",
          "psa_10_price",
          "box_only_price",
          "manual_only_price",
          "sales_volume",
          "has_loose_price",
          "has_graded_price",
          "has_new_price",
          "image_url",
          "price_fields",
          "last_synced_at"
        ]
      });
      const results = response.hits
        .map((hit: PriceChartingSearchDocument) => searchDocumentToResult(hit, query))
        .filter((result): result is NonNullable<typeof result> => Boolean(result));
      if (results.length) {
        return {
          results,
          valuation: resultToValuation(results[0]),
          source: "meilisearch_pricecharting_catalog",
          total: response.estimatedTotalHits
        };
      }
    } catch {
      // Fall through to the live PriceCharting API. Search should fail soft, not block adding.
    }
  }

  return searchPriceCharting(query, Math.min(limit, 20));
}

function resultToValuation(result: NonNullable<ReturnType<typeof searchDocumentToResult>>) {
  return {
    marketValue: result.price,
    priceLow: result.priceLow ?? result.price,
    priceHigh: result.priceHigh ?? result.price,
    avgPrice: result.avgPrice ?? result.price,
    sampleSize: result.soldCount ?? 1,
    lastSalePrice: result.lastSalePrice ?? result.price,
    lastSaleDate: result.lastSaleDate ?? null,
    confidence: result.priceConfidence ?? "LOW"
  };
}

function escapeFilter(value: string) {
  return value.replace(/"/g, '\\"');
}
