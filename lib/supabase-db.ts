"use client";

import type { User } from "@supabase/supabase-js";
import { demoUser } from "@/lib/demo-data";
import { storageBuckets, supabase } from "@/lib/supabase";
import type { Category, Listing, NotificationEvent, NotificationPreferences, Offer, PortfolioSnapshot, PriceHistoryPoint, PushToken, VaultDocument, VaultItem, VaultPhoto, VaultUser, WatchlistItem } from "@/lib/types";
import { getTier, isDynamicImageResolverUrl } from "@/lib/portfolio-utils";
import type { NewVaultItemInput } from "@/lib/vault-store";

const fallbackImage = "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1200&q=80";

export interface RemoteVaultState {
  user: VaultUser;
  items: VaultItem[];
  portfolioSnapshots: PortfolioSnapshot[];
  listings: Listing[];
  offers: Offer[];
  watchlist: WatchlistItem[];
  notificationPrefs: NotificationPreferences;
  notificationEvents: NotificationEvent[];
  pushTokens: PushToken[];
}

export async function ensureVaultProfile(authUser: User) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const username = authUser.email?.split("@")[0] ?? `collector-${authUser.id.slice(0, 8)}`;
  const { error } = await supabase.from("profiles").upsert({
    id: authUser.id,
    email: authUser.email ?? "",
    username,
    avatar_url: authUser.user_metadata?.avatar_url ?? null,
    tier: "Collector",
    last_active_at: new Date().toISOString()
  }, { onConflict: "id" });
  if (error) throw error;
}

export async function loadVaultFromSupabase(authUser: User): Promise<RemoteVaultState> {
  if (!supabase) throw new Error("Supabase is not configured.");
  await ensureVaultProfile(authUser);

  const [
    profileResult,
    itemsResult,
    photosResult,
    docsResult,
    priceHistoryResult,
    portfolioSnapshotResult,
    listingsResult,
    offersResult,
    watchlistResult,
    notificationResult,
    tokenResult
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", authUser.id).single(),
    supabase.from("items").select("*").eq("user_id", authUser.id).eq("is_sold", false).order("created_at", { ascending: false }),
    supabase.from("photos").select("*").order("order", { ascending: true }),
    supabase.from("documents").select("*").order("uploaded_at", { ascending: false }),
    supabase.from("price_history").select("*").order("recorded_at", { ascending: true }),
    supabase.from("portfolio_snapshots").select("*").eq("user_id", authUser.id).order("snapshot_date", { ascending: true }),
    supabase.from("listings").select("*").eq("seller_user_id", authUser.id).order("created_at", { ascending: false }),
    supabase.from("offers").select("*").order("created_at", { ascending: false }),
    supabase.from("watchlist").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }),
    supabase.from("notification_events").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }),
    supabase.from("push_tokens").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false })
  ]);

  [profileResult, itemsResult, photosResult, docsResult, priceHistoryResult, portfolioSnapshotResult, listingsResult, offersResult, watchlistResult, notificationResult, tokenResult].forEach((result) => {
    if (result.error) throw result.error;
  });

  const rawItems = itemsResult.data ?? [];
  const itemIds = new Set(rawItems.map((item) => item.id));
  const photos = (photosResult.data ?? []).filter((photo) => itemIds.has(photo.item_id)).map(mapPhoto);
  const documents = (docsResult.data ?? []).filter((document) => itemIds.has(document.item_id)).map(mapDocument);
  const priceHistory = (priceHistoryResult.data ?? []).filter((point) => itemIds.has(point.item_id)).map(mapPricePoint);
  const items = rawItems.map((item) => mapItem(
    item,
    photos.filter((photo) => photo.itemId === item.id),
    documents.filter((document) => document.itemId === item.id),
    priceHistory.filter((point) => point.itemId === item.id)
  ));

  const totalValue = items.reduce((sum, item) => sum + displayValue(item), 0);
  const profile = profileResult.data;
  const user = mapProfile(profile, authUser, totalValue, items.length);

  await writePortfolioSnapshot(user.id, totalValue, items.reduce((sum, item) => sum + item.costBasis, 0), items.length);
  const portfolioSnapshots = mergeTodaySnapshot(
    (portfolioSnapshotResult.data ?? []).map(mapPortfolioSnapshot),
    user.id,
    totalValue,
    items.reduce((sum, item) => sum + item.costBasis, 0),
    items.length
  );

  return {
    user,
    items,
    portfolioSnapshots,
    listings: (listingsResult.data ?? []).map(mapListing),
    offers: (offersResult.data ?? []).filter((offer) => itemIds.has(offer.item_id)).map(mapOffer),
    watchlist: (watchlistResult.data ?? []).map(mapWatchlist),
    notificationPrefs: mapNotificationPrefs(profile),
    notificationEvents: (notificationResult.data ?? []).map(mapNotificationEvent),
    pushTokens: (tokenResult.data ?? []).map(mapPushToken)
  };
}

export async function addVaultItemToSupabase(input: NewVaultItemInput, user: VaultUser): Promise<VaultItem> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const now = new Date().toISOString();
  const currentValueMarket = input.currentValueMarket ?? null;
  const currentValueUser = input.currentValueUser;
  const displayCurrentValue = currentValueMarket ?? currentValueUser;

  const { data: itemRow, error } = await supabase.from("items").insert({
    user_id: user.id,
    name: input.name,
    category: input.category,
    brand: input.brand,
    reference_number: input.referenceNumber ?? null,
    edition_number: input.editionNumber ?? null,
    edition_total: input.editionTotal ?? null,
    condition: input.condition,
    cost_basis: input.costBasis,
    currency: "USD",
    acquired_date: input.acquiredDate,
    acquired_from: input.acquiredFrom ?? null,
    notes: input.notes,
    story: input.story,
    current_value_user: currentValueUser,
    current_value_market: currentValueMarket,
    current_value_source: currentValueMarket ? (input.pricechartingId ? "PriceCharting Guide Value" : "eBay Sold Listings") : "Your estimate",
    current_value_updated_at: now,
    value_24h_ago: displayCurrentValue,
    ebay_search_query: input.ebaySearchQuery ?? null,
    ebay_reference: input.ebayReference ?? null,
    price_low: input.priceLow ?? null,
    price_high: input.priceHigh ?? null,
    last_sale_price: input.lastSalePrice ?? null,
    last_sale_date: input.lastSaleDate ?? null,
    price_sample_size: input.priceSampleSize ?? null,
    price_confidence: input.priceConfidence ?? null,
    pricecharting_id: input.pricechartingId ?? null,
    pricecharting_console: input.pricechartingConsole ?? null,
    pricecharting_price_field: input.pricechartingPriceField ?? null,
    pricecharting_last_sync_at: input.pricechartingId ? now : null,
    listing_status: "none",
    is_sold: false
  }).select("*").single();

  if (error) throw error;

  const photos = await uploadPhotos(itemRow.id, user.id, input.photoFiles, input.photoUrls);
  const documents = await uploadDocuments(itemRow.id, user.id, input.documentFiles);
  const priceHistory = await insertInitialPriceHistory(itemRow.id, input.costBasis, input.acquiredDate, currentValueUser, now, currentValueMarket);
  const item = mapItem(itemRow, photos, documents, priceHistory);

  await refreshProfileRollups(user.id);
  return item;
}

export async function updateSupabaseEstimate(itemId: string, value: number) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const now = new Date().toISOString();
  const { error } = await supabase.from("items").update({
    current_value_user: value,
    current_value_market: null,
    current_value_source: "Your estimate",
    current_value_updated_at: now,
    updated_at: now
  }).eq("id", itemId);
  if (error) throw error;
  const { error: historyError } = await supabase.from("price_history").insert({ item_id: itemId, value, source: "user", recorded_at: now });
  if (historyError) throw historyError;
}

export async function updateSupabaseItemDetails(itemId: string, input: Partial<Pick<VaultItem, "name" | "brand" | "referenceNumber" | "condition" | "costBasis" | "currentValueUser" | "acquiredDate" | "acquiredFrom" | "notes" | "story">>) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const now = new Date().toISOString();
  const payload = {
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.brand !== undefined ? { brand: input.brand } : {}),
    ...(input.referenceNumber !== undefined ? { reference_number: input.referenceNumber ?? null } : {}),
    ...(input.condition !== undefined ? { condition: input.condition } : {}),
    ...(input.costBasis !== undefined ? { cost_basis: input.costBasis } : {}),
    ...(input.currentValueUser !== undefined ? { current_value_user: input.currentValueUser, current_value_market: null, current_value_source: "Your estimate", current_value_updated_at: now } : {}),
    ...(input.acquiredDate !== undefined ? { acquired_date: input.acquiredDate } : {}),
    ...(input.acquiredFrom !== undefined ? { acquired_from: input.acquiredFrom ?? null } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.story !== undefined ? { story: input.story } : {}),
    updated_at: now
  };
  const { error } = await supabase.from("items").update(payload).eq("id", itemId);
  if (error) throw error;
  if (input.currentValueUser !== undefined) {
    const { error: historyError } = await supabase.from("price_history").insert({ item_id: itemId, value: input.currentValueUser, source: "user", recorded_at: now });
    if (historyError) throw historyError;
  }
  const { data: row } = await supabase.from("items").select("user_id").eq("id", itemId).maybeSingle();
  if (row?.user_id) await refreshProfileRollups(row.user_id);
}

export async function setSupabaseOpenToOffers(item: VaultItem, user: VaultUser, enabled: boolean, floorPrice?: number) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const now = new Date().toISOString();
  const status = enabled ? "open_to_offers" : "none";
  const { error: itemError } = await supabase.from("items").update({
    listing_status: status,
    offer_floor_price: enabled ? floorPrice ?? null : null,
    updated_at: now
  }).eq("id", item.id);
  if (itemError) throw itemError;

  const { data: existing, error: existingError } = await supabase.from("listings").select("*").eq("item_id", item.id).eq("seller_user_id", user.id).maybeSingle();
  if (existingError) throw existingError;
  const payload = { asking_price: floorPrice ?? null, status: enabled ? "open_to_offers" : "removed", updated_at: now };
  const result = existing
    ? await supabase.from("listings").update(payload).eq("id", existing.id)
    : await supabase.from("listings").insert({ item_id: item.id, seller_user_id: user.id, ...payload });
  if (result.error) throw result.error;
}

export async function updateSupabaseNotificationPrefs(userId: string, prefs: Partial<NotificationPreferences>) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("profiles").update(toNotificationPrefColumns(prefs)).eq("id", userId);
  if (error) throw error;
}

export async function insertSupabasePushToken(userId: string, token: string, platform: PushToken["platform"] = "web") {
  if (!supabase) throw new Error("Supabase is not configured.");
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("push_tokens").upsert({
    user_id: userId,
    token,
    platform,
    last_used_at: now
  }, { onConflict: "token" }).select("*").single();
  if (error) throw error;
  return mapPushToken(data);
}

export async function insertSupabaseNotificationEvents(events: NotificationEvent[]) {
  if (!supabase || !events.length) return;
  const { error } = await supabase.from("notification_events").insert(events.map((event) => ({
    user_id: event.userId,
    type: event.type,
    title: event.title,
    body: event.body,
    item_id: event.itemId ?? null,
    priority: event.priority,
    channel: event.channel,
    status: event.status,
    created_at: event.createdAt,
    read_at: event.readAt ?? null
  })));
  if (error) throw error;
}

export async function addProofFilesToSupabaseItem(itemId: string, userId: string, photoFiles: File[], documentFiles: Array<{ file: File; type: VaultDocument["type"] }>, existingPhotoCount = 0) {
  const [photos, documents] = await Promise.all([
    uploadPhotos(itemId, userId, photoFiles, [], false, existingPhotoCount + 1, existingPhotoCount === 0),
    uploadDocuments(itemId, userId, documentFiles)
  ]);
  return { photos, documents };
}

export async function deleteSupabasePhoto(photoId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) throw error;
}

export async function deleteSupabaseItem(itemId: string, userId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.from("items").delete().eq("id", itemId).eq("user_id", userId);
  if (error) throw error;
  await refreshProfileRollups(userId);
}

export async function setSupabasePrimaryPhoto(itemId: string, photoId: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error: clearError } = await supabase.from("photos").update({ is_primary: false }).eq("item_id", itemId);
  if (clearError) throw clearError;
  const { error } = await supabase.from("photos").update({ is_primary: true }).eq("id", photoId);
  if (error) throw error;
}

async function uploadPhotos(itemId: string, userId: string, files: File[], remoteUrls: string[] = [], useFallback = true, startOrder = 1, allowPrimary = true): Promise<VaultPhoto[]> {
  if (!supabase) return [];
  if (!files.length && !remoteUrls.length && useFallback) {
    return [{ id: `${itemId}-fallback-photo`, itemId, url: fallbackImage, order: 1, isPrimary: true, createdAt: new Date().toISOString() }];
  }

  const rows = [];
  const remotePhotoUrls = remoteUrls.filter((url) => !isDynamicImageResolverUrl(url)).slice(0, 6);
  for (let index = 0; index < remotePhotoUrls.length; index += 1) {
    const url = remotePhotoUrls[index];
    rows.push({ item_id: itemId, url, order: startOrder + index, is_primary: allowPrimary && index === 0 });
  }
  const uploadFiles = files.slice(0, 6);
  for (let index = 0; index < uploadFiles.length; index += 1) {
    const file = uploadFiles[index];
    const path = `${userId}/${itemId}/${Date.now()}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from(storageBuckets.photos).upload(path, file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(storageBuckets.photos).getPublicUrl(path);
    const order = startOrder + remotePhotoUrls.length + index;
    rows.push({ item_id: itemId, url: data.publicUrl, order, is_primary: allowPrimary && remotePhotoUrls.length === 0 && index === 0 });
  }
  if (!rows.length) return [];
  const { data, error } = await supabase.from("photos").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []).map(mapPhoto);
}

async function uploadDocuments(itemId: string, userId: string, documents: Array<{ file: File; type: VaultDocument["type"] }>): Promise<VaultDocument[]> {
  if (!supabase || !documents.length) return [];
  const rows = [];
  for (const document of documents) {
    const path = `${userId}/${itemId}/${Date.now()}-${safeFileName(document.file.name)}`;
    const { error } = await supabase.storage.from(storageBuckets.documents).upload(path, document.file, { upsert: false });
    if (error) throw error;
    const { data } = supabase.storage.from(storageBuckets.documents).getPublicUrl(path);
    rows.push({ item_id: itemId, url: data.publicUrl, filename: document.file.name, doc_type: document.type });
  }
  const { data, error } = await supabase.from("documents").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []).map(mapDocument);
}

async function insertInitialPriceHistory(itemId: string, costBasis: number, acquiredDate: string, currentValueUser: number, now: string, currentValueMarket?: number | null): Promise<PriceHistoryPoint[]> {
  if (!supabase) return [];
  const rows = [
    { item_id: itemId, value: costBasis, source: "user", recorded_at: acquiredDate },
    { item_id: itemId, value: currentValueUser, source: "user", recorded_at: now }
  ];
  if (currentValueMarket) rows.push({ item_id: itemId, value: currentValueMarket, source: "market", recorded_at: now });
  const { data, error } = await supabase.from("price_history").insert(rows).select("*");
  if (error) throw error;
  return (data ?? []).map(mapPricePoint);
}

async function writePortfolioSnapshot(userId: string, totalValue: number, totalCostBasis: number, itemCount: number) {
  if (!supabase) return;
  const snapshotDate = new Date().toISOString().slice(0, 10);
  console.log("Writing snapshot:", { userId, totalValue, itemCount });
  await supabase.from("portfolio_snapshots").upsert({
    user_id: userId,
    snapshot_date: snapshotDate,
    total_value: totalValue,
    total_cost_basis: totalCostBasis,
    item_count: itemCount
  }, { onConflict: "user_id,snapshot_date" });
}

async function refreshProfileRollups(userId: string) {
  if (!supabase) return;
  const { data } = await supabase.from("items").select("cost_basis,current_value_user,current_value_market").eq("user_id", userId).eq("is_sold", false);
  const totalValue = (data ?? []).reduce((sum, item) => sum + Number(item.current_value_market ?? item.current_value_user ?? 0), 0);
  const totalCost = (data ?? []).reduce((sum, item) => sum + Number(item.cost_basis ?? 0), 0);
  await supabase.from("profiles").update({
    total_items: data?.length ?? 0,
    total_value_cached: totalValue,
    total_cost_basis_cached: totalCost,
    tier: getTier(totalValue)
  }).eq("id", userId);
  await writePortfolioSnapshot(userId, totalValue, totalCost, data?.length ?? 0);
}

function mapProfile(row: any, authUser: User, totalValue: number, totalItems: number): VaultUser {
  return {
    id: authUser.id,
    email: row?.email ?? authUser.email ?? "",
    username: row?.username ?? authUser.email?.split("@")[0] ?? demoUser.username,
    createdAt: row?.created_at ?? authUser.created_at ?? new Date().toISOString(),
    tier: getTier(totalValue),
    totalItems,
    totalValueCached: totalValue,
    streakMonths: row?.streak_months ?? 0,
    avatarUrl: row?.avatar_url ?? undefined
  };
}

function mapItem(row: any, photos: VaultPhoto[], documents: VaultDocument[], priceHistory: PriceHistoryPoint[]): VaultItem {
  const currentValueMarket = row.current_value_market === null ? undefined : Number(row.current_value_market);
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    subcategory: row.subcategory ?? undefined,
    brand: row.brand ?? "",
    referenceNumber: row.reference_number ?? undefined,
    editionNumber: numberOrUndefined(row.edition_number),
    editionTotal: numberOrUndefined(row.edition_total),
    condition: row.condition ?? "",
    costBasis: Number(row.cost_basis ?? 0),
    currency: "USD",
    acquiredDate: row.acquired_date,
    acquiredFrom: row.acquired_from ?? undefined,
    notes: row.notes ?? "",
    story: row.story ?? "",
    currentValueUser: Number(row.current_value_user ?? row.cost_basis ?? 0),
    currentValueMarket,
    currentValueSource: row.current_value_source ?? (row.pricecharting_id ? "PriceCharting Guide Value" : currentValueMarket ? "eBay Sold Listings" : "Your estimate"),
    currentValueUpdatedAt: row.current_value_updated_at ?? row.updated_at,
    value24hAgo: numberOrUndefined(row.value_24h_ago),
    ebaySearchQuery: row.ebay_search_query ?? undefined,
    ebayReference: row.ebay_reference ?? undefined,
    priceLow: numberOrUndefined(row.price_low),
    priceHigh: numberOrUndefined(row.price_high),
    priceSampleSize: numberOrUndefined(row.price_sample_size),
    priceConfidence: row.price_confidence ?? undefined,
    pricechartingId: row.pricecharting_id ?? undefined,
    pricechartingConsole: row.pricecharting_console ?? undefined,
    pricechartingPriceField: row.pricecharting_price_field ?? undefined,
    pricechartingLastSyncAt: row.pricecharting_last_sync_at ?? undefined,
    lastSalePrice: numberOrUndefined(row.last_sale_price),
    lastSaleDate: row.last_sale_date ?? undefined,
    listingStatus: row.listing_status ?? "none",
    offerFloorPrice: numberOrUndefined(row.offer_floor_price),
    isSold: Boolean(row.is_sold),
    soldPrice: numberOrUndefined(row.sold_price),
    soldDate: row.sold_date ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    photos,
    documents,
    priceHistory,
    marketComps: []
  };
}

function mapPhoto(row: any): VaultPhoto {
  return { id: row.id, itemId: row.item_id, url: row.url, order: row.order, isPrimary: row.is_primary, createdAt: row.created_at };
}

function mapDocument(row: any): VaultDocument {
  return { id: row.id, itemId: row.item_id, url: row.url, filename: row.filename, type: row.doc_type, uploadedAt: row.uploaded_at };
}

function mapPricePoint(row: any): PriceHistoryPoint {
  return { id: row.id, itemId: row.item_id, value: Number(row.value), source: row.source, recordedAt: row.recorded_at };
}

function mapPortfolioSnapshot(row: any): PortfolioSnapshot {
  return {
    id: row.id,
    userId: row.user_id,
    snapshotDate: row.snapshot_date,
    totalValue: Number(row.total_value ?? 0),
    totalCostBasis: Number(row.total_cost_basis ?? 0),
    totalGain: Number(row.total_gain ?? 0),
    totalGainPct: Number(row.total_gain_pct ?? 0),
    dailyDelta: Number(row.daily_delta ?? 0),
    dailyDeltaPct: Number(row.daily_delta_pct ?? 0),
    itemCount: Number(row.item_count ?? 0),
    createdAt: row.created_at
  };
}

function mergeTodaySnapshot(snapshots: PortfolioSnapshot[], userId: string, totalValue: number, totalCostBasis: number, itemCount: number) {
  const today = new Date().toISOString().slice(0, 10);
  const totalGain = totalValue - totalCostBasis;
  const totalGainPct = totalCostBasis > 0 ? totalGain / totalCostBasis : 0;
  const previous = [...snapshots].reverse().find((snapshot) => snapshot.snapshotDate < today);
  const previousValue = previous?.totalValue ?? totalValue;
  const dailyDelta = totalValue - previousValue;
  const dailyDeltaPct = previousValue > 0 ? dailyDelta / previousValue : 0;
  const current: PortfolioSnapshot = {
    id: `snapshot-${userId}-${today}`,
    userId,
    snapshotDate: today,
    totalValue,
    totalCostBasis,
    totalGain,
    totalGainPct,
    dailyDelta,
    dailyDeltaPct,
    itemCount,
    createdAt: new Date().toISOString()
  };
  return [...snapshots.filter((snapshot) => snapshot.snapshotDate !== today), current].sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate));
}

function mapListing(row: any): Listing {
  return { id: row.id, itemId: row.item_id, sellerUserId: row.seller_user_id, askingPrice: numberOrUndefined(row.asking_price), status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapOffer(row: any): Offer {
  return { id: row.id, itemId: row.item_id, listingId: row.listing_id, buyerUsername: row.buyer_username ?? "collector", offerPrice: Number(row.offer_price), message: row.message ?? undefined, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapWatchlist(row: any): WatchlistItem {
  const prefs = row.alert_preferences ?? {};
  return { id: row.id, userId: row.user_id, itemIdentifier: row.item_identifier, name: row.name, category: row.category, imageUrl: row.image_url ?? undefined, currentPrice: Number(row.current_price ?? 0), value24hAgo: Number(row.value_24h_ago ?? 0), value7dAgo: Number(row.value_7d_ago ?? 0), watchers: row.watchers ?? 0, status: row.status ?? "not_for_sale", targetPrice: numberOrUndefined(row.target_price), alertPreferences: { acceptedOffer: Boolean(prefs.acceptedOffer ?? true), priceBelow: prefs.priceBelow, listed: Boolean(prefs.listed ?? true) }, createdAt: row.created_at };
}

function mapNotificationPrefs(row: any): NotificationPreferences {
  return {
    notifyPriceAth: row?.notify_price_ath ?? true,
    notifyPriceUpPct: row?.notify_price_up_pct ?? 10,
    notifyPriceDownPct: row?.notify_price_down_pct ?? 15,
    notifyMarketMoves: row?.notify_market_moves ?? true,
    notifyOfferReceived: row?.notify_offer_received ?? true,
    notifyDigestDaily: row?.notify_digest_daily ?? false,
    notifyDigestWeekly: row?.notify_digest_weekly ?? true,
    quietHoursStart: row?.quiet_hours_start ?? "22:00",
    quietHoursEnd: row?.quiet_hours_end ?? "08:00"
  };
}

function mapNotificationEvent(row: any): NotificationEvent {
  return { id: row.id, userId: row.user_id, type: row.type, title: row.title, body: row.body, itemId: row.item_id ?? undefined, priority: row.priority, channel: row.channel, status: row.status, createdAt: row.created_at, readAt: row.read_at ?? undefined };
}

function mapPushToken(row: any): PushToken {
  return { id: row.id, userId: row.user_id, token: row.token, platform: row.platform, createdAt: row.created_at, lastUsedAt: row.last_used_at };
}

function toNotificationPrefColumns(prefs: Partial<NotificationPreferences>) {
  return {
    ...(prefs.notifyPriceAth !== undefined ? { notify_price_ath: prefs.notifyPriceAth } : {}),
    ...(prefs.notifyPriceUpPct !== undefined ? { notify_price_up_pct: prefs.notifyPriceUpPct } : {}),
    ...(prefs.notifyPriceDownPct !== undefined ? { notify_price_down_pct: prefs.notifyPriceDownPct } : {}),
    ...(prefs.notifyMarketMoves !== undefined ? { notify_market_moves: prefs.notifyMarketMoves } : {}),
    ...(prefs.notifyOfferReceived !== undefined ? { notify_offer_received: prefs.notifyOfferReceived } : {}),
    ...(prefs.notifyDigestDaily !== undefined ? { notify_digest_daily: prefs.notifyDigestDaily } : {}),
    ...(prefs.notifyDigestWeekly !== undefined ? { notify_digest_weekly: prefs.notifyDigestWeekly } : {}),
    ...(prefs.quietHoursStart !== undefined ? { quiet_hours_start: prefs.quietHoursStart } : {}),
    ...(prefs.quietHoursEnd !== undefined ? { quiet_hours_end: prefs.quietHoursEnd } : {})
  };
}

function displayValue(item: VaultItem) {
  return item.currentValueMarket ?? item.currentValueUser;
}

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").replace(/(^-|-$)/g, "");
}

function numberOrUndefined(value: unknown) {
  return value === null || value === undefined ? undefined : Number(value);
}
