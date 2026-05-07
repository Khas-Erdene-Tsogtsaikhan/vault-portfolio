import { categories, type Category, type TierName, type VaultItem, type VaultMilestone, type VaultPhoto } from "@/lib/types";

export const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export const preciseCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const compactCurrency = {
  format(value: number) {
    const abs = Math.abs(value);
    const sign = value < 0 ? "-" : "";
    if (abs >= 1000000) return `${sign}$${trimDecimal(abs / 1000000)}M`;
    if (abs >= 1000) return `${sign}$${trimDecimal(abs / 1000)}K`;
    return `${sign}$${Math.round(abs).toLocaleString("en-US")}`;
  }
};
export const percent = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });

const emptyVaultItem: VaultItem = {
  id: "empty-vault-item",
  userId: "empty",
  name: "First Vault Asset",
  category: "other",
  brand: "VAULT",
  condition: "Ready to add",
  costBasis: 0,
  currency: "USD",
  acquiredDate: new Date().toISOString().slice(0, 10),
  notes: "",
  story: "",
  currentValueUser: 0,
  currentValueSource: "Your estimate",
  currentValueUpdatedAt: new Date().toISOString(),
  value24hAgo: 0,
  listingStatus: "none",
  isSold: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  photos: [],
  documents: [],
  priceHistory: [],
  marketComps: []
};

export const valueMilestones: VaultMilestone[] = [
  { label: "$10k", value: 10000, percentile: 72 },
  { label: "$25k", value: 25000, percentile: 82 },
  { label: "$50k", value: 50000, percentile: 89 },
  { label: "$100k", value: 100000, percentile: 94 },
  { label: "$250k", value: 250000, percentile: 97 },
  { label: "$500k", value: 500000, percentile: 99 },
  { label: "$1M", value: 1000000, percentile: 99.7 }
];

export const tierConfig: Record<TierName, { min: number; max: number; color: string; description: string }> = {
  Collector: { min: 0, max: 999, color: "text-vault-muted", description: "Your vault is forming." },
  Enthusiast: { min: 1000, max: 9999, color: "text-slate-300", description: "The portfolio habit is starting." },
  Curator: { min: 10000, max: 49999, color: "text-vault-blue", description: "A collection with visible gravity." },
  Connoisseur: { min: 50000, max: 149999, color: "text-vault-purple", description: "Taste with measurable performance." },
  Patron: { min: 150000, max: 499999, color: "text-vault-gold", description: "A serious physical asset portfolio." },
  Obsidian: { min: 500000, max: 999999, color: "text-vault-text", description: "Private-bank energy, built object by object." },
  Legendary: { min: 1000000, max: Number.POSITIVE_INFINITY, color: "gold-text", description: "A collection that has become legacy capital." }
};

export function categoryLabel(category: Category) {
  const labels: Record<Category, string> = {
    watches: "Watches",
    wine: "Wine",
    spirits: "Spirits",
    art: "Art",
    sneakers: "Sneakers",
    jewelry: "Jewelry",
    trading_cards: "Trading Cards",
    books: "Books",
    coins: "Coins",
    video_games: "Video Games",
    comics: "Comics",
    funko: "Funko",
    lego: "LEGO",
    vintage_clothing: "Vintage Clothing",
    cars: "Cars",
    guitars: "Guitars",
    furniture: "Furniture",
    other: "Other"
  };
  return labels[category];
}

export function getCurrentValue(item: VaultItem) {
  return item.currentValueMarket ?? item.currentValueUser;
}

export function getPrimaryPhoto(photos: VaultPhoto[]) {
  return photos.find((photo) => photo.isPrimary) ?? photos[0];
}

export function getItemReturn(item: VaultItem) {
  const amount = getCurrentValue(item) - item.costBasis;
  return { amount, percentage: item.costBasis ? amount / item.costBasis : 0 };
}

export function getItemDailyDelta(item: VaultItem) {
  const current = getCurrentValue(item);
  const previous = item.value24hAgo ?? item.priceHistory.at(-2)?.value ?? current;
  const amount = current - previous;
  return { amount, percentage: previous ? amount / previous : 0 };
}

export function getTier(totalValue: number): TierName {
  if (totalValue >= 1000000) return "Legendary";
  if (totalValue >= 500000) return "Obsidian";
  if (totalValue >= 150000) return "Patron";
  if (totalValue >= 50000) return "Connoisseur";
  if (totalValue >= 10000) return "Curator";
  if (totalValue >= 1000) return "Enthusiast";
  return "Collector";
}

export function getNextTierProgress(totalValue: number) {
  const ordered = Object.entries(tierConfig) as Array<[TierName, (typeof tierConfig)[TierName]]>;
  const next = ordered.find(([, config]) => totalValue < config.min);
  if (!next) return null;
  const [name, config] = next;
  const previousMin = ordered[Math.max(0, ordered.findIndex(([tier]) => tier === name) - 1)]?.[1].min ?? 0;
  const progress = (totalValue - previousMin) / (config.min - previousMin);
  return {
    tier: name,
    target: config.min,
    away: Math.max(0, config.min - totalValue),
    progress: Math.max(0, Math.min(1, progress))
  };
}

export function getPercentile(totalValue: number) {
  if (totalValue >= 1000000) return 99.7;
  if (totalValue >= 500000) return 99;
  if (totalValue >= 250000) return 97;
  if (totalValue >= 100000) return 94;
  if (totalValue >= 50000) return 89;
  if (totalValue >= 25000) return 82;
  if (totalValue >= 10000) return 72;
  return Math.max(37, Math.round(totalValue / 250));
}

export function getPortfolioMetrics(items: VaultItem[]) {
  const totalValue = items.reduce((sum, item) => sum + getCurrentValue(item), 0);
  const costBasis = items.reduce((sum, item) => sum + item.costBasis, 0);
  const totalReturn = totalValue - costBasis;
  const totalReturnPercent = costBasis ? totalReturn / costBasis : 0;
  const value24hAgo = items.reduce((sum, item) => sum + (item.value24hAgo ?? item.priceHistory.at(-2)?.value ?? item.currentValueUser), 0);
  const todayDelta = totalValue - value24hAgo;
  const todayDeltaPercent = value24hAgo ? todayDelta / value24hAgo : 0;
  const topItem = [...items].sort((a, b) => getCurrentValue(b) - getCurrentValue(a))[0] ?? emptyVaultItem;
  const bestPerformer = [...items].sort((a, b) => getItemReturn(b).percentage - getItemReturn(a).percentage)[0] ?? emptyVaultItem;
  const worstPerformer = [...items].sort((a, b) => getItemReturn(a).percentage - getItemReturn(b).percentage)[0] ?? emptyVaultItem;
  const rarestPiece = [...items].sort((a, b) => rarityScore(a) - rarityScore(b))[0] ?? emptyVaultItem;
  const categoryBreakdown = getCategoryBreakdown(items);
  const hottestCategory = [...categoryBreakdown].sort((a, b) => b.returnPercentage - a.returnPercentage)[0];
  const documentedScore = Math.round(average(items.map(getCompletenessScore)));
  const tier = getTier(totalValue);
  const percentile = getPercentile(totalValue);

  return {
    totalValue,
    costBasis,
    totalReturn,
    totalReturnPercent,
    value24hAgo,
    todayDelta,
    todayDeltaPercent,
    topItem,
    bestPerformer,
    worstPerformer,
    rarestPiece,
    hottestCategory,
    documentedScore,
    tier,
    percentile,
    itemCount: items.length,
    acquisitionStreak: getAcquisitionStreak(items)
  };
}

export function getCategoryBreakdown(items: VaultItem[]) {
  const totalValue = items.reduce((sum, item) => sum + getCurrentValue(item), 0);
  return categories
    .map((category) => {
      const categoryItems = items.filter((item) => item.category === category);
      const value = categoryItems.reduce((sum, item) => sum + getCurrentValue(item), 0);
      const cost = categoryItems.reduce((sum, item) => sum + item.costBasis, 0);
      const returnAmount = value - cost;
      return {
        category,
        value,
        cost,
        count: categoryItems.length,
        returnAmount,
        returnPercentage: cost ? returnAmount / cost : 0,
        concentration: totalValue ? value / totalValue : 0
      };
    })
    .filter((item) => item.count > 0)
    .sort((a, b) => b.value - a.value);
}

export function getPortfolioHistory(items: VaultItem[]) {
  if (!items.length) {
    return ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"].map((month, index) => ({ date: `2026-${String(Math.max(1, index + 1)).padStart(2, "0")}-01`, month, value: 0, sp500: 0 }));
  }
  const today = startOfDay(new Date());
  const knownDates = items.flatMap((item) => [
    item.acquiredDate,
    item.createdAt,
    item.currentValueUpdatedAt,
    ...item.priceHistory.map((point) => point.recordedAt)
  ]);
  const earliestKnown = knownDates.reduce((earliest, value) => {
    const date = startOfDay(new Date(value));
    return date < earliest ? date : earliest;
  }, today);
  const start = earliestKnown >= today ? addDays(today, -1) : earliestKnown;
  const dates = buildSampleDates(start, today);
  const costBasis = items.reduce((sum, item) => sum + item.costBasis, 0);

  return dates.map((date, index) => ({
    date: date.toISOString(),
    month: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: items.reduce((sum, item) => sum + getItemValueAt(item, date.toISOString()), 0),
    sp500: costBasis * (1 + index * 0.011)
  }));
}

export function getItemHighLow(item: VaultItem) {
  const values = item.priceHistory.map((point) => point.value);
  values.push(item.currentValueUser);
  return {
    high: Math.max(...values),
    low: Math.min(...values)
  };
}

export function getLiquidity(item: VaultItem) {
  const sales = item.salesLast30Days ?? Math.max(1, item.marketComps.length * 3);
  if (sales >= 10) return `High (${sales} sales in last 30 days)`;
  if (sales >= 2) return `Medium (${sales} sales in last 30 days)`;
  return `Low (${sales} sale in last 30 days)`;
}

export function getMonthlyAcquisitions(items: VaultItem[]) {
  const months = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  return months.map((month, index) => ({
    month,
    count: Math.max(0, items.filter((item) => new Date(item.createdAt).getMonth() === (10 + index) % 12).length),
    value: items
      .filter((item) => new Date(item.createdAt).getMonth() === (10 + index) % 12)
      .reduce((sum, item) => sum + getCurrentValue(item), 0)
  }));
}

export function getCompletenessScore(item: VaultItem) {
  const photoScore = Math.min(item.photos.length, 3) * 15;
  const docScore = Math.min(item.documents.length, 4) * 12;
  const storyScore = item.story.length > 40 ? 18 : 0;
  const referenceScore = item.referenceNumber ? 10 : 0;
  return Math.min(100, photoScore + docScore + storyScore + referenceScore);
}

export function getAcquisitionStreak(items: VaultItem[]) {
  if (!items.length) return 0;
  const monthKeys = new Set(items.map((item) => item.createdAt.slice(0, 7)));
  const start = new Date("2026-05-01T00:00:00Z");
  let streak = 0;
  for (let i = 0; i < 24; i += 1) {
    const date = new Date(start);
    date.setMonth(start.getMonth() - i);
    const key = date.toISOString().slice(0, 7);
    if (!monthKeys.has(key)) break;
    streak += 1;
  }
  return Math.max(streak, 7);
}

export function getCrossedMilestone(totalValue: number) {
  return [...valueMilestones].reverse().find((milestone) => totalValue >= milestone.value);
}

export function collectorDna(items: VaultItem[]) {
  const breakdown = getCategoryBreakdown(items);
  const top = breakdown[0];
  const second = breakdown[1];
  if (!top) return "Your collector DNA is waiting for its first signal.";
  return `You're a ${categoryLabel(top.category)}-forward investor${second ? ` with a growing interest in ${categoryLabel(second.category)}` : ""}.`;
}

function rarityScore(item: VaultItem) {
  if (!item.editionNumber || !item.editionTotal) return 9999;
  return item.editionNumber / item.editionTotal;
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function getItemValueAt(item: VaultItem, date: string) {
  const dateMs = startOfDay(new Date(date)).getTime();
  const acquiredMs = startOfDay(new Date(item.acquiredDate || item.createdAt)).getTime();
  if (dateMs < acquiredMs) return 0;
  const sorted = [...item.priceHistory].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  const point = [...sorted].reverse().find((candidate) => candidate.recordedAt <= date);
  if (item.currentValueUpdatedAt <= date) return getCurrentValue(item);
  return point?.value ?? item.costBasis;
}

function buildSampleDates(start: Date, end: Date) {
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const step = days > 730 ? 14 : days > 180 ? 7 : 1;
  const dates: Date[] = [];
  for (let cursor = startOfDay(start); cursor <= end; cursor = addDays(cursor, step)) {
    dates.push(cursor);
  }
  if (dates.at(-1)?.getTime() !== end.getTime()) dates.push(end);
  return dates;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function trimDecimal(value: number) {
  return value.toFixed(1).replace(/\.0$/, "");
}
