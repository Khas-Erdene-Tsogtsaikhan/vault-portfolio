import { NextResponse } from "next/server";
import { extractPriceChartingImage, slug } from "@/lib/catalog-image-resolver";

export const dynamic = "force-dynamic";

const imageCache = new Map<string, { expiresAt: number; url: string | null }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name")?.trim() ?? "";
  const consoleName = searchParams.get("console")?.trim() ?? "";
  if (!name || !consoleName) return svgFallback(name || "VAULT");

  const key = `${consoleName}:${name}`.toLowerCase();
  const cached = imageCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url ? NextResponse.redirect(cached.url) : svgFallback(name);
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
    const imageUrl = extractPriceChartingImage(html);
    imageCache.set(key, { url: imageUrl, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
    return imageUrl ? NextResponse.redirect(imageUrl) : svgFallback(name);
  } catch {
    imageCache.set(key, { url: null, expiresAt: Date.now() + 60 * 60 * 1000 });
    return svgFallback(name);
  }
}

function svgFallback(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "V";
  const safeInitials = escapeXml(initials);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#0d0d12"/>
    <rect x="8" y="8" width="184" height="184" rx="14" fill="#111118" stroke="#2a2a3a"/>
    <circle cx="100" cy="86" r="42" fill="#c9a84c" fill-opacity=".12" stroke="#4a3d1a"/>
    <text x="100" y="100" text-anchor="middle" font-family="Georgia,serif" font-size="42" fill="#c9a84c">${safeInitials}</text>
    <text x="100" y="152" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" letter-spacing="2" fill="#8a8680">PRICECHARTING</text>
  </svg>`;
  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600"
    }
  });
}

function escapeXml(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", "\"": "&quot;" }[char] as string));
}
