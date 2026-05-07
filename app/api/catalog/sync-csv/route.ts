import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json({
    error: "CSV catalog sync is no longer available through the web app.",
    nextStep: "Use scripts/seed-meilisearch.ts locally or from GitHub Actions. Supabase must never receive full PriceCharting CSV catalog imports."
  }, { status: 410 });
}
