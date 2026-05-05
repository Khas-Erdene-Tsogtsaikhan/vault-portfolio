import type { Listing, MarketActivity, MarketIndex, Offer, VaultDocument, VaultItem, VaultUser, WatchlistItem } from "@/lib/types";

const userId = "demo-user";

function photos(itemId: string, urls: string[]) {
  return urls.map((url, index) => ({
    id: `${itemId}-photo-${index + 1}`,
    itemId,
    url,
    order: index + 1,
    isPrimary: index === 0,
    createdAt: "2026-05-01"
  }));
}

function docs(itemId: string, names: Array<[VaultDocument["type"], string]>): VaultDocument[] {
  return names.map(([type, filename], index) => ({
    id: `${itemId}-doc-${index + 1}`,
    itemId,
    url: "#",
    filename,
    type,
    uploadedAt: "2026-05-01"
  }));
}

function history(itemId: string, values: number[]) {
  return values.map((value, index) => ({
    id: `${itemId}-history-${index + 1}`,
    itemId,
    value,
    source: "user" as const,
    recordedAt: new Date(2025, 5 + index, 1).toISOString()
  }));
}

export const demoUser: VaultUser = {
  id: userId,
  email: "demo@vault.local",
  username: "jaspervault",
  createdAt: "2024-11-01",
  tier: "Patron",
  totalItems: 12,
  totalValueCached: 0,
  streakMonths: 7
};

export const demoItems: VaultItem[] = [
  {
    id: "patek-nautilus-5711",
    userId,
    name: "Patek Philippe Nautilus 5711",
    category: "watches",
    subcategory: "Steel sports watch",
    brand: "Patek Philippe",
    referenceNumber: "5711/1A-010",
    editionNumber: 41,
    editionTotal: 100,
    condition: "Near Mint",
    costBasis: 34000,
    currency: "USD",
    acquiredDate: "2018-01-20",
    acquiredFrom: "Private dealer",
    notes: "Full set. Blue dial. Service papers included.",
    story: "Acquired before the 5711 mania fully broke open. It became the anchor piece that made the collection feel like capital, not clutter.",
    currentValueUser: 118000,
    currentValueMarket: 116500,
    currentValueSource: "Your estimate",
    currentValueUpdatedAt: "2026-05-01T09:00:00Z",
    value24hAgo: 116500,
    salesLast30Days: 18,
    lastSalePrice: 117800,
    lastSaleDate: "2026-04-29T09:00:00Z",
    population: 100,
    listingStatus: "open_to_offers",
    offerFloorPrice: 125000,
    isSold: false,
    createdAt: "2026-01-10T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    photos: photos("patek-nautilus-5711", ["https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?auto=format&fit=crop&w=1400&q=82"]),
    documents: docs("patek-nautilus-5711", [["receipt", "patek-purchase-receipt.pdf"], ["certificate", "archive-extract.pdf"], ["service", "service-record-2025.pdf"], ["appraisal", "valuation-note.pdf"]]),
    priceHistory: history("patek-nautilus-5711", [76000, 79000, 83500, 89000, 93000, 97500, 102000, 108000, 111000, 114000, 116500, 118000]),
    marketComps: [
      { id: "comp-patek-1", source: "WatchCharts placeholder", title: "5711/1A blue dial full set", price: 117800, soldAt: "2026-04-14", confidence: "High" },
      { id: "comp-patek-2", source: "Chrono24 placeholder", title: "5711/1A excellent condition", price: 115900, soldAt: "2026-03-29", confidence: "Medium" }
    ]
  },
  {
    id: "charizard-1st-edition",
    userId,
    name: "Charizard 1st Edition Holo",
    category: "trading_cards",
    brand: "Pokemon",
    referenceNumber: "Base Set 4/102",
    editionNumber: 9,
    editionTotal: 100,
    condition: "PSA 9",
    costBasis: 12500,
    currency: "USD",
    acquiredDate: "2020-09-12",
    acquiredFrom: "Auction",
    notes: "Case clean, serial photographed.",
    story: "A childhood grail upgraded into a measurable position. The slab made the emotional value legible.",
    currentValueUser: 42000,
    currentValueMarket: 40500,
    currentValueSource: "Your estimate",
    currentValueUpdatedAt: "2026-05-01T09:00:00Z",
    value24hAgo: 41660,
    salesLast30Days: 47,
    lastSalePrice: 41500,
    lastSaleDate: "2026-04-29T09:00:00Z",
    population: 91,
    listingStatus: "none",
    isSold: false,
    createdAt: "2026-02-01T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    photos: photos("charizard-1st-edition", ["/cards-charizard.svg"]),
    documents: docs("charizard-1st-edition", [["receipt", "auction-invoice.pdf"], ["certificate", "psa-cert.png"], ["appraisal", "card-valuation.pdf"]]),
    priceHistory: history("charizard-1st-edition", [30500, 31200, 33000, 34800, 36100, 37400, 38200, 38900, 39750, 40500, 41400, 42000]),
    marketComps: [{ id: "comp-card-1", source: "TCGPlayer placeholder", title: "PSA 9 1st Edition Holo", price: 41500, soldAt: "2026-04-19", confidence: "Medium" }]
  },
  {
    id: "rolex-submariner-126610ln",
    userId,
    name: "Rolex Submariner Date",
    category: "watches",
    brand: "Rolex",
    referenceNumber: "126610LN",
    condition: "Excellent",
    costBasis: 10800,
    currency: "USD",
    acquiredDate: "2022-08-14",
    acquiredFrom: "Authorized dealer",
    notes: "Full set. Worn sparingly.",
    story: "The daily icon. The piece that made the vault feel both wearable and financially disciplined.",
    currentValueUser: 15100,
    currentValueMarket: 14900,
    currentValueSource: "Your estimate",
    currentValueUpdatedAt: "2026-05-01T09:00:00Z",
    value24hAgo: 14980,
    salesLast30Days: 28,
    lastSalePrice: 14950,
    lastSaleDate: "2026-05-01T09:00:00Z",
    isSold: false,
    createdAt: "2026-02-09T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    photos: photos("rolex-submariner-126610ln", ["https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&w=1400&q=82"]),
    documents: docs("rolex-submariner-126610ln", [["receipt", "ad-receipt.pdf"], ["certificate", "warranty-card.png"]]),
    priceHistory: history("rolex-submariner-126610ln", [12800, 12950, 13200, 13400, 13600, 13900, 14100, 14300, 14550, 14800, 14950, 15100]),
    marketComps: []
  },
  {
    id: "mira-kline-original",
    userId,
    name: "Nocturne Study",
    category: "art",
    brand: "Mira Kline",
    referenceNumber: "Oil on linen",
    editionNumber: 1,
    editionTotal: 1,
    condition: "Excellent",
    costBasis: 18000,
    currency: "USD",
    acquiredDate: "2017-03-08",
    acquiredFrom: "Gallery",
    notes: "Signed verso with gallery provenance.",
    story: "The first artwork that changed the room. Its value now reflects both taste and timing.",
    currentValueUser: 38500,
    currentValueMarket: 37000,
    currentValueSource: "Your estimate",
    currentValueUpdatedAt: "2026-05-01T09:00:00Z",
    value24hAgo: 38100,
    salesLast30Days: 3,
    lastSalePrice: 37400,
    lastSaleDate: "2026-04-20T09:00:00Z",
    population: 1,
    listingStatus: "open_to_offers",
    offerFloorPrice: 41000,
    isSold: false,
    createdAt: "2026-02-18T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    photos: photos("mira-kline-original", ["https://images.unsplash.com/photo-1547891654-e66ed7ebb968?auto=format&fit=crop&w=1400&q=82"]),
    documents: docs("mira-kline-original", [["receipt", "gallery-invoice.pdf"], ["certificate", "artist-coa.pdf"], ["press", "exhibition-note.pdf"]]),
    priceHistory: history("mira-kline-original", [29200, 30100, 31300, 32500, 33100, 34000, 35100, 35900, 36800, 37400, 38100, 38500]),
    marketComps: []
  },
  {
    id: "jordan-1-chicago-1985",
    userId,
    name: "Air Jordan 1 Chicago 1985",
    category: "sneakers",
    brand: "Nike",
    referenceNumber: "High OG",
    editionNumber: 72,
    editionTotal: 100,
    condition: "Lightly worn",
    costBasis: 3600,
    currency: "USD",
    acquiredDate: "2019-05-19",
    acquiredFrom: "Specialist platform",
    notes: "Authenticated, original laces.",
    story: "A culture position with financial teeth. The pair tracks taste, scarcity, and nostalgia in one object.",
    currentValueUser: 18800,
    currentValueMarket: 18100,
    currentValueSource: "Your estimate",
    currentValueUpdatedAt: "2026-05-01T09:00:00Z",
    value24hAgo: 18460,
    salesLast30Days: 63,
    lastSalePrice: 18500,
    lastSaleDate: "2026-05-03T09:00:00Z",
    isSold: false,
    createdAt: "2026-03-01T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    photos: photos("jordan-1-chicago-1985", ["https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=1400&q=82"]),
    documents: docs("jordan-1-chicago-1985", [["receipt", "sneaker-invoice.pdf"], ["certificate", "authentication.pdf"]]),
    priceHistory: history("jordan-1-chicago-1985", [11800, 12400, 13100, 13900, 14600, 15200, 16000, 16600, 17300, 18100, 18500, 18800]),
    marketComps: []
  },
  {
    id: "margaux-1982-case",
    userId,
    name: "Chateau Margaux 1982 Case",
    category: "wine",
    brand: "Chateau Margaux",
    referenceNumber: "6-bottle case",
    condition: "Professionally stored",
    costBasis: 9200,
    currency: "USD",
    acquiredDate: "2016-11-03",
    acquiredFrom: "Cellar sale",
    notes: "Storage records attached.",
    story: "A patient asset. The case turned storage discipline into a visible portfolio return.",
    currentValueUser: 24600,
    currentValueMarket: 23900,
    currentValueSource: "Your estimate",
    currentValueUpdatedAt: "2026-05-01T09:00:00Z",
    value24hAgo: 24210,
    salesLast30Days: 8,
    lastSalePrice: 24100,
    lastSaleDate: "2026-04-28T09:00:00Z",
    isSold: false,
    createdAt: "2026-03-14T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    photos: photos("margaux-1982-case", ["https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1400&q=82"]),
    documents: docs("margaux-1982-case", [["receipt", "cellar-sale.pdf"], ["appraisal", "wine-valuation.pdf"], ["other", "storage-log.pdf"]]),
    priceHistory: history("margaux-1982-case", [18100, 18700, 19300, 19900, 20500, 21100, 21800, 22400, 23000, 23600, 24100, 24600]),
    marketComps: []
  },
  {
    id: "leica-m6-titanium",
    userId,
    name: "Leica M6 Titanium",
    category: "other",
    brand: "Leica",
    referenceNumber: "M6 TTL Titanium",
    condition: "Excellent",
    costBasis: 4100,
    currency: "USD",
    acquiredDate: "2018-06-29",
    acquiredFrom: "Camera dealer",
    notes: "CLA record and box.",
    story: "A tool, a sculpture, and a scarcity bet.",
    currentValueUser: 9800,
    currentValueMarket: 9600,
    currentValueSource: "Your estimate",
    currentValueUpdatedAt: "2026-05-01T09:00:00Z",
    value24hAgo: 9650,
    salesLast30Days: 5,
    lastSalePrice: 9650,
    lastSaleDate: "2026-04-26T09:00:00Z",
    isSold: false,
    createdAt: "2026-04-01T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    photos: photos("leica-m6-titanium", ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=82"]),
    documents: docs("leica-m6-titanium", [["receipt", "dealer-invoice.pdf"], ["service", "cla-record.pdf"]]),
    priceHistory: history("leica-m6-titanium", [6900, 7100, 7350, 7600, 7900, 8200, 8500, 8800, 9100, 9400, 9650, 9800]),
    marketComps: []
  }
];

export const marketIndices: MarketIndex[] = [
  { id: "pokemon-top-100", name: "Pokemon Top 100 Index", category: "trading_cards", ytdReturn: 0.042, todayReturn: 0.008 },
  { id: "hype-sneaker", name: "Hype Sneaker Index", category: "sneakers", ytdReturn: 0.031, todayReturn: -0.003 },
  { id: "psa10-vintage-sports", name: "PSA 10 Vintage Sports Index", category: "trading_cards", ytdReturn: 0.064, todayReturn: 0.012 }
];

export const marketActivity: MarketActivity[] = [
  { id: "feed-1", itemName: "PSA 9 Charizard 1st Edition", category: "trading_cards", message: "just sold for $41,500, up 8% versus last month", deltaPercentage: 0.08, occurredAt: "2026-05-04T19:00:00Z" },
  { id: "feed-2", itemName: "Jordan 1 Chicago 1985", category: "sneakers", message: "last sale hit $18,500, up $340 this week", deltaPercentage: 0.023, occurredAt: "2026-05-04T18:00:00Z" },
  { id: "feed-3", itemName: "Pokemon Top 100 Index", category: "trading_cards", message: "closed +0.8% today", deltaPercentage: 0.008, occurredAt: "2026-05-04T17:00:00Z" }
];

export const demoListings: Listing[] = [
  { id: "listing-patek", itemId: "patek-nautilus-5711", sellerUserId: userId, askingPrice: 125000, status: "open_to_offers", createdAt: "2026-05-02T09:00:00Z", updatedAt: "2026-05-02T09:00:00Z" },
  { id: "listing-art", itemId: "mira-kline-original", sellerUserId: userId, askingPrice: 41000, status: "open_to_offers", createdAt: "2026-05-01T09:00:00Z", updatedAt: "2026-05-01T09:00:00Z" }
];

export const demoOffers: Offer[] = [
  { id: "offer-1", itemId: "patek-nautilus-5711", listingId: "listing-patek", buyerUsername: "collector_prime", offerPrice: 112400, message: "Serious interest if full set is confirmed.", status: "pending", createdAt: "2026-05-03T12:00:00Z", updatedAt: "2026-05-03T12:00:00Z" },
  { id: "offer-2", itemId: "mira-kline-original", listingId: "listing-art", buyerUsername: "gallerydesk", offerPrice: 36200, message: "Would love to discuss provenance.", status: "pending", createdAt: "2026-05-04T10:30:00Z", updatedAt: "2026-05-04T10:30:00Z" }
];

export const demoWatchlist: WatchlistItem[] = [
  { id: "watch-jordan-bred", userId, itemIdentifier: "jordan-1-bred-toe-ds-size-10", name: "Jordan 1 Bred Toe DS Size 10", category: "sneakers", imageUrl: "https://images.unsplash.com/photo-1556906781-9a412961c28c?auto=format&fit=crop&w=900&q=80", currentPrice: 340, value24hAgo: 331, value7dAgo: 300, watchers: 428, status: "open_to_offers", targetPrice: 300, alertPreferences: { acceptedOffer: true, priceBelow: 300, listed: true }, createdAt: "2026-05-01T09:00:00Z" },
  { id: "watch-pokemon-umbreon", userId, itemIdentifier: "umbreon-vmax-alt-art-psa-10", name: "Umbreon VMAX Alt Art PSA 10", category: "trading_cards", imageUrl: "/cards-charizard.svg", currentPrice: 1480, value24hAgo: 1460, value7dAgo: 1390, watchers: 611, status: "not_for_sale", targetPrice: 1300, alertPreferences: { acceptedOffer: true, priceBelow: 1300, listed: true }, createdAt: "2026-05-02T09:00:00Z" },
  { id: "watch-speedmaster", userId, itemIdentifier: "omega-speedmaster-sapphire-sandwich", name: "Omega Speedmaster Sapphire Sandwich", category: "watches", imageUrl: "https://images.unsplash.com/photo-1526045431048-f857369baa09?auto=format&fit=crop&w=900&q=80", currentPrice: 6800, value24hAgo: 6760, value7dAgo: 6610, watchers: 203, status: "listed", targetPrice: 6400, alertPreferences: { acceptedOffer: true, priceBelow: 6400, listed: true }, createdAt: "2026-05-03T09:00:00Z" }
];
