import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return fallback();

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return fallback();
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return fallback();
  }

  const allowedDomains = [
    "images.pricecharting.com",
    "www.pricecharting.com",
    "pricecharting.com",
    "supabase.co",
    "storage.googleapis.com",
    "images.unsplash.com"
  ];
  if (!allowedDomains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))) {
    return fallback();
  }

  const response = await fetch(url, {
    headers: {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      "user-agent": "Mozilla/5.0 (compatible; VAULT/1.0; +https://vault.gg)"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return fallback();
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return fallback();
  }

  const body = await response.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400",
      "access-control-allow-origin": "*"
    }
  });
}

function fallback() {
  return NextResponse.redirect(new URL("/placeholders/card.svg", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
}
