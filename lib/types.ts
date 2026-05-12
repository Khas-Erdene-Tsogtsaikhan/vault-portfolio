export const categories = [
  "watches",
  "wine",
  "spirits",
  "art",
  "sneakers",
  "jewelry",
  "trading_cards",
  "books",
  "coins",
  "video_games",
  "comics",
  "figurines",
  "funko",
  "lego",
  "vintage_clothing",
  "cars",
  "guitars",
  "furniture",
  "other"
] as const;

export type Category = (typeof categories)[number];

export type TierName = "Collector" | "Enthusiast" | "Curator" | "Connoisseur" | "Patron" | "Obsidian" | "Legendary";

export interface VaultUser {
  id: string;
  email: string;
  username: string;
  createdAt: string;
  tier: TierName;
  totalItems: number;
  totalValueCached: number;
  streakMonths: number;
  avatarUrl?: string;
}

export interface NotificationPreferences {
  notifyPriceAth: boolean;
  notifyPriceUpPct: number;
  notifyPriceDownPct: number;
  notifyMarketMoves: boolean;
  notifyOfferReceived: boolean;
  notifyDigestDaily: boolean;
  notifyDigestWeekly: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: "web" | "ios" | "android";
  createdAt: string;
  lastUsedAt: string;
}

export interface NotificationEvent {
  id: string;
  userId: string;
  type: "ATH" | "PRICE_UP" | "PRICE_DOWN" | "WEEKLY_DIGEST" | "MILESTONE" | "OFFER_RECEIVED" | "MARKET_MOVE";
  title: string;
  body: string;
  itemId?: string;
  priority: "high" | "medium" | "low";
  channel: "web" | "email" | "in_app";
  status: "queued" | "sent" | "skipped";
  createdAt: string;
  readAt?: string;
}

export interface VaultPhoto {
  id: string;
  itemId: string;
  url: string;
  order: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface VaultDocument {
  id: string;
  itemId: string;
  url: string;
  filename: string;
  type: "receipt" | "certificate" | "appraisal" | "service" | "customs" | "press" | "other";
  uploadedAt: string;
}

export const documentTypes = ["receipt", "certificate", "appraisal", "service", "customs", "press", "other"] as const;

export const documentTypeLabels: Record<VaultDocument["type"], string> = {
  receipt: "Receipt",
  certificate: "Certificate",
  appraisal: "Appraisal",
  service: "Service Record",
  customs: "Customs",
  press: "Press / Publication",
  other: "Other"
};

export interface PriceHistoryPoint {
  id: string;
  itemId: string;
  value: number;
  source: "user" | "market" | "appraisal";
  recordedAt: string;
}

export interface PortfolioSnapshot {
  id: string;
  userId: string;
  snapshotDate: string;
  totalValue: number;
  totalCostBasis: number;
  totalGain: number;
  totalGainPct: number;
  dailyDelta: number;
  dailyDeltaPct: number;
  itemCount: number;
  createdAt: string;
}

export interface MarketComp {
  id: string;
  source: string;
  title: string;
  price: number;
  soldAt: string;
  confidence: "High" | "Medium" | "Low";
  imageUrl?: string;
  url?: string;
  itemId?: string;
}

export interface VaultItem {
  id: string;
  userId: string;
  name: string;
  category: Category;
  subcategory?: string;
  brand: string;
  referenceNumber?: string;
  editionNumber?: number;
  editionTotal?: number;
  condition: string;
  costBasis: number;
  currency: "USD";
  acquiredDate: string;
  acquiredFrom?: string;
  notes: string;
  story: string;
  currentValueUser: number;
  currentValueMarket?: number;
  currentValueSource: "Your estimate" | "Market placeholder" | "Appraisal" | "eBay Sold Listings" | "PriceCharting Guide Value";
  currentValueUpdatedAt: string;
  value24hAgo?: number;
  ebaySearchQuery?: string;
  ebayReference?: string;
  priceLow?: number;
  priceHigh?: number;
  priceSampleSize?: number;
  priceConfidence?: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  pricechartingId?: string;
  pricechartingConsole?: string;
  pricechartingPriceField?: string;
  pricechartingLastSyncAt?: string;
  salesLast30Days?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  population?: number;
  listingStatus?: "none" | "open_to_offers" | "listed" | "sold";
  offerFloorPrice?: number;
  isSold: boolean;
  soldPrice?: number;
  soldDate?: string;
  createdAt: string;
  updatedAt: string;
  photos: VaultPhoto[];
  documents: VaultDocument[];
  priceHistory: PriceHistoryPoint[];
  marketComps: MarketComp[];
}

export interface VaultMilestone {
  label: string;
  value: number;
  percentile: number;
}

export interface MarketIndex {
  id: string;
  name: string;
  category: Category;
  ytdReturn: number;
  todayReturn: number;
}

export interface MarketActivity {
  id: string;
  itemName: string;
  category: Category;
  message: string;
  deltaPercentage: number;
  occurredAt: string;
}

export interface Listing {
  id: string;
  itemId: string;
  sellerUserId: string;
  askingPrice?: number;
  status: "draft" | "open_to_offers" | "active" | "sold" | "removed";
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  id: string;
  itemId: string;
  listingId: string;
  buyerUsername: string;
  offerPrice: number;
  message?: string;
  status: "pending" | "accepted" | "declined" | "countered";
  createdAt: string;
  updatedAt: string;
}

export interface WatchlistItem {
  id: string;
  userId: string;
  itemIdentifier: string;
  name: string;
  category: Category;
  imageUrl?: string;
  currentPrice: number;
  value24hAgo: number;
  value7dAgo: number;
  watchers: number;
  status: "not_for_sale" | "open_to_offers" | "listed";
  targetPrice?: number;
  alertPreferences: {
    acceptedOffer: boolean;
    priceBelow?: number;
    listed: boolean;
  };
  createdAt: string;
}

export interface MarketSearchResult {
  id: string;
  title: string;
  category: Category;
  imageUrl?: string;
  price: number;
  source: string;
  confidence: "High" | "Medium" | "Low";
  url?: string;
  soldCount?: number;
  condition?: string;
  soldAt?: string;
  priceLow?: number;
  priceHigh?: number;
  avgPrice?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  priceConfidence?: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  searchQuery?: string;
  marketStatus?: "recent_sales" | "active_listings" | "mock" | "no_recent_sales";
  pricechartingId?: string;
  pricechartingConsole?: string;
  pricechartingPriceField?: string;
  priceOptions?: Array<{ field: string; label: string; value: number }>;
}
