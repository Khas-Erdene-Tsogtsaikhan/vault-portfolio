import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("url");
  if (!raw) return NextResponse.json({ error: "Missing image URL." }, { status: 400 });

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid image URL." }, { status: 400 });
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return NextResponse.json({ error: "Unsupported image URL." }, { status: 400 });
  }

  const response = await fetch(url, {
    headers: {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      "user-agent": "VAULT Share Image Proxy"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return NextResponse.json({ error: `Image fetch failed: ${response.status}` }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json({ error: "URL did not return an image." }, { status: 415 });
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
