import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const imageCache = new Map<string, { expiresAt: number; url: string | null }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim() ?? "";
  const consoleName = searchParams.get("console")?.trim() ?? "";
  if (!name || !consoleName) return new NextResponse(null, { status: 404 });

  const key = `${consoleName}:${name}`.toLowerCase();
  const cached = imageCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url ? NextResponse.redirect(cached.url) : new NextResponse(null, { status: 404 });
  }

  const pageUrl = `https://www.pricecharting.com/game/${slug(consoleName)}/${slug(name)}`;
  try {
    const response = await fetch(pageUrl, {
      headers: { "user-agent": "VAULT/1.0 collector portfolio image resolver" },
      signal: AbortSignal.timeout(4500),
      next: { revalidate: 60 * 60 * 24 }
    });
    if (!response.ok) throw new Error(`PriceCharting page returned ${response.status}`);
    const html = await response.text();
    const imageUrl = extractImageUrl(html);
    imageCache.set(key, { url: imageUrl, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    return imageUrl ? NextResponse.redirect(imageUrl) : new NextResponse(null, { status: 404 });
  } catch {
    imageCache.set(key, { url: null, expiresAt: Date.now() + 60 * 60 * 1000 });
    return new NextResponse(null, { status: 404 });
  }
}

function extractImageUrl(html: string) {
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (og) return normalizeImageUrl(og);
  const direct = html.match(/https:\/\/storage\.googleapis\.com\/images\.pricecharting\.com\/[^"'\s<>]+\/(?:200|400|1600)\.jpg/i)?.[0];
  if (direct) return direct;
  const relative = html.match(/\/images\.pricecharting\.com\/[^"'\s<>]+\/(?:200|400|1600)\.jpg/i)?.[0];
  return relative ? `https://storage.googleapis.com${relative}` : null;
}

function normalizeImageUrl(value: string) {
  if (value.startsWith("http")) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `https://www.pricecharting.com${value}`;
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/#/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
