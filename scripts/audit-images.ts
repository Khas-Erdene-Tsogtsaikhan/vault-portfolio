import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

loadLocalEnv();

const args = parseArgs(process.argv.slice(2));
const limit = Number(args.limit ?? 5000);
const shouldRepair = Boolean(args.repair);

interface PhotoRow {
  id: string;
  item_id: string;
  url: string | null;
  is_primary: boolean | null;
  order: number | null;
}

interface ItemRow {
  id: string;
  user_id: string;
  name: string;
  pricecharting_id: string | null;
  pricecharting_console: string | null;
  brand: string | null;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: photos, error: photoError } = await supabaseAdmin
    .from("photos")
    .select("id,item_id,url,is_primary,order")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (photoError) throw photoError;

  const photoRows = (photos ?? []) as PhotoRow[];
  const itemIds = Array.from(new Set(photoRows.map((photo) => photo.item_id)));
  const { data: items, error: itemError } = itemIds.length
    ? await supabaseAdmin
        .from("items")
        .select("id,user_id,name,pricecharting_id,pricecharting_console,brand")
        .in("id", itemIds)
      : { data: [], error: null };
  if (itemError) throw itemError;

  const itemsById = new Map((items as ItemRow[]).map((item) => [item.id, item]));
  const buckets = summarize(photoRows);
  console.log("=== VAULT Image Audit ===");
  console.table(buckets);

  const grouped = groupPhotosByItem(photoRows);
  const itemIssues = Array.from(grouped.entries())
    .map(([itemId, itemPhotos]) => classifyItem(itemId, itemPhotos, itemsById.get(itemId)))
    .filter((item) => item.issue !== "ok");

  console.log(`Checked ${photoRows.length.toLocaleString()} photo rows across ${grouped.size.toLocaleString()} items.`);
  console.log(`Items needing attention: ${itemIssues.length.toLocaleString()}`);
  for (const issue of itemIssues.slice(0, 25)) {
    console.log(`- ${issue.issue}: ${issue.itemName} (${issue.itemId}) -> ${issue.detail}`);
  }

  if (shouldRepair) {
    const repaired = await repairLegacyShareUrls(supabaseAdmin, photoRows);
    console.log(`Repair complete. Rewrote ${repaired.toLocaleString()} legacy share image URL${repaired === 1 ? "" : "s"}.`);
  } else {
    console.log("Dry run only. Re-run with --repair to unwrap legacy /api/share/image URLs.");
  }
}

function summarize(photos: PhotoRow[]) {
  const summary = {
    total: photos.length,
    blank: 0,
    dynamicMarketResolver: 0,
    legacyShareResolver: 0,
    supabaseStorage: 0,
    pricechartingStatic: 0,
    pokemonTcg: 0,
    scryfall: 0,
    heicOrHeif: 0,
    otherHttp: 0,
    otherRelative: 0
  };

  for (const photo of photos) {
    const url = photo.url ?? "";
    if (!url.trim()) summary.blank += 1;
    else if (isMarketResolver(url)) summary.dynamicMarketResolver += 1;
    else if (isLegacyShareResolver(url)) summary.legacyShareResolver += 1;
    else if (url.includes(".supabase.co/storage/")) summary.supabaseStorage += 1;
    else if (isPriceChartingStatic(url)) summary.pricechartingStatic += 1;
    else if (url.includes("images.pokemontcg.io")) summary.pokemonTcg += 1;
    else if (url.includes("cards.scryfall.io")) summary.scryfall += 1;
    else if (isHeic(url)) summary.heicOrHeif += 1;
    else if (url.startsWith("http")) summary.otherHttp += 1;
    else summary.otherRelative += 1;
  }

  return summary;
}

function classifyItem(itemId: string, photos: PhotoRow[], item?: ItemRow) {
  const stable = photos.filter((photo) => isStablePhotoUrl(photo.url ?? ""));
  const primary = photos.find((photo) => photo.is_primary);
  if (!photos.length) {
    return { itemId, itemName: item?.name ?? "Unknown item", issue: "no_photos", detail: "No photo rows stored." };
  }
  if (stable.length === 0 && item?.pricecharting_id) {
    return { itemId, itemName: item.name, issue: "fallback_only", detail: "Only dynamic or invalid photos; UI must rely on computed PriceCharting fallback." };
  }
  if (primary && !isStablePhotoUrl(primary.url ?? "")) {
    return { itemId, itemName: item?.name ?? "Unknown item", issue: "unstable_primary", detail: primary.url ?? "blank primary URL" };
  }
  return { itemId, itemName: item?.name ?? "Unknown item", issue: "ok", detail: "" };
}

async function repairLegacyShareUrls(supabaseAdmin: any, photos: PhotoRow[]) {
  let repaired = 0;
  for (const photo of photos) {
    const unwrapped = unwrapLegacyShareUrl(photo.url ?? "");
    if (!unwrapped || !isStablePhotoUrl(unwrapped)) continue;
    const { error } = await supabaseAdmin
      .from("photos")
      .update({ url: unwrapped })
      .eq("id", photo.id);
    if (error) throw error;
    repaired += 1;
  }
  return repaired;
}

function groupPhotosByItem(photos: PhotoRow[]) {
  const grouped = new Map<string, PhotoRow[]>();
  for (const photo of photos) {
    const existing = grouped.get(photo.item_id) ?? [];
    existing.push(photo);
    grouped.set(photo.item_id, existing);
  }
  return grouped;
}

function isStablePhotoUrl(url: string) {
  const normalized = unwrapLegacyShareUrl(url) ?? url;
  if (!normalized) return false;
  if (isMarketResolver(normalized) || isLegacyShareResolver(normalized)) return false;
  return normalized.startsWith("http") || normalized.startsWith("/");
}

function unwrapLegacyShareUrl(url: string) {
  if (!isLegacyShareResolver(url)) return null;
  const query = url.split("?")[1];
  if (!query) return null;
  const original = new URLSearchParams(query).get("url");
  return original ? decodeURIComponent(original) : null;
}

function isMarketResolver(url: string) {
  return url.includes("/api/market/image");
}

function isLegacyShareResolver(url: string) {
  return url.includes("/api/share/image");
}

function isPriceChartingStatic(url: string) {
  return url.includes("images.pricecharting.com")
    || url.includes("storage.googleapis.com/images.pricecharting.com")
    || url.includes("www.pricecharting.com");
}

function isHeic(url: string) {
  const clean = url.split("?")[0].toLowerCase();
  return clean.endsWith(".heic") || clean.endsWith(".heif");
}

function parseArgs(values: string[]) {
  return values.reduce<Record<string, string | boolean>>((parsed, value) => {
    if (!value.startsWith("--")) return parsed;
    const [key, raw] = value.slice(2).split("=");
    parsed[key] = raw ?? true;
    return parsed;
  }, {});
}

function loadLocalEnv() {
  try {
    const path = ".env.local";
    if (!existsSync(path)) return;
    const lines = readFileSync(path, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Environment variables are optional here; the main guard reports missing required values.
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
