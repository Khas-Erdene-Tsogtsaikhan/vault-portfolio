import type { PriceChartingSearchDocument } from "@/lib/pricecharting-documents";

export interface ImageResolution {
  imageUrl: string;
  imageSource: "pokemon_tcg" | "scryfall" | "pricecharting_page";
}

export async function resolveCatalogImage(document: Pick<PriceChartingSearchDocument, "product_name" | "console_name" | "category">): Promise<ImageResolution | null> {
  if (isPokemon(document)) {
    const pokemon = await resolvePokemonImage(document);
    if (pokemon) return pokemon;
  }

  if (isMagic(document)) {
    const magic = await resolveScryfallImage(document);
    if (magic) return magic;
  }

  return resolvePriceChartingPageImage(document);
}

function isPokemon(document: Pick<PriceChartingSearchDocument, "product_name" | "console_name" | "category">) {
  return /pokemon/i.test(`${document.console_name} ${document.product_name}`);
}

function isMagic(document: Pick<PriceChartingSearchDocument, "product_name" | "console_name" | "category">) {
  return /magic|mtg/i.test(`${document.console_name} ${document.product_name}`);
}

async function resolvePokemonImage(document: Pick<PriceChartingSearchDocument, "product_name" | "console_name">): Promise<ImageResolution | null> {
  const name = cleanCardName(document.product_name);
  if (!name) return null;

  const number = document.product_name.match(/#([A-Za-z0-9-]+)/)?.[1];
  const setName = document.console_name.replace(/^Pokemon\s+/i, "").trim();
  const queryParts = [`name:"${escapePokemonQuery(name)}"`];
  if (number) queryParts.push(`number:${escapePokemonQuery(number)}`);
  if (setName && !/promo|cards/i.test(setName)) queryParts.push(`set.name:"${escapePokemonQuery(setName)}"`);

  const exact = await fetchPokemonCard(queryParts.join(" "));
  const relaxed = exact ?? await fetchPokemonCard([`name:"${escapePokemonQuery(name)}"`, number ? `number:${escapePokemonQuery(number)}` : ""].filter(Boolean).join(" "));
  const imageUrl = relaxed?.images?.large ?? relaxed?.images?.small;
  return imageUrl ? { imageUrl, imageSource: "pokemon_tcg" } : null;
}

async function fetchPokemonCard(query: string) {
  const url = new URL("https://api.pokemontcg.io/v2/cards");
  url.searchParams.set("q", query);
  url.searchParams.set("pageSize", "1");
  const headers: Record<string, string> = { "user-agent": "VAULT/1.0 catalog image enrichment" };
  if (process.env.POKEMON_TCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
  try {
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(5500) });
    if (!response.ok) return null;
    const data = await response.json() as { data?: Array<{ images?: { small?: string; large?: string } }> };
    return data.data?.[0] ?? null;
  } catch {
    return null;
  }
}

async function resolveScryfallImage(document: Pick<PriceChartingSearchDocument, "product_name">): Promise<ImageResolution | null> {
  const name = cleanCardName(document.product_name);
  if (!name) return null;

  const url = new URL("https://api.scryfall.com/cards/named");
  url.searchParams.set("fuzzy", name);
  try {
    const response = await fetch(url, {
      headers: { "user-agent": "VAULT/1.0 catalog image enrichment", accept: "application/json" },
      signal: AbortSignal.timeout(5500)
    });
    if (!response.ok) return null;
    const data = await response.json() as {
      image_uris?: { normal?: string; large?: string };
      card_faces?: Array<{ image_uris?: { normal?: string; large?: string } }>;
    };
    const imageUrl = data.image_uris?.large ?? data.image_uris?.normal ?? data.card_faces?.[0]?.image_uris?.large ?? data.card_faces?.[0]?.image_uris?.normal;
    return imageUrl ? { imageUrl, imageSource: "scryfall" } : null;
  } catch {
    return null;
  }
}

export async function resolvePriceChartingPageImage(document: Pick<PriceChartingSearchDocument, "product_name" | "console_name">): Promise<ImageResolution | null> {
  const pageUrl = `https://www.pricecharting.com/game/${slug(document.console_name)}/${slug(document.product_name)}`;
  try {
    const response = await fetch(pageUrl, {
      headers: { "user-agent": "VAULT/1.0 catalog image enrichment" },
      signal: AbortSignal.timeout(5500)
    });
    if (!response.ok) return null;
    const imageUrl = extractPriceChartingImage(await response.text());
    return imageUrl ? { imageUrl, imageSource: "pricecharting_page" } : null;
  } catch {
    return null;
  }
}

export function extractPriceChartingImage(html: string) {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (og) return normalizeImageUrl(og);
  const direct = html.match(/https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\/[^"'\s<>]+\/(?:200|400|1600)\.jpg/i)?.[0];
  if (direct) return direct;
  const relative = html.match(/\/images\.pricecharting\.com\/[^"'\s<>]+\/(?:200|400|1600)\.jpg/i)?.[0];
  return relative ? `https://storage.googleapis.com${relative}` : null;
}

function cleanCardName(value: string) {
  return value
    .replace(/\s+#?[A-Z]*\d+[A-Z-]*$/i, "")
    .replace(/\s+\[[^\]]+\]$/g, "")
    .replace(/\s+\([^)]*\)$/g, "")
    .trim();
}

function escapePokemonQuery(value: string) {
  return value.replace(/"/g, '\\"');
}

function normalizeImageUrl(value: string) {
  if (value.startsWith("http")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `https://www.pricecharting.com${value}`;
}

export function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/#/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
