import { getItemDailyDelta, getItemReturn, getPortfolioMetrics, valueMilestones } from "@/lib/portfolio-utils";
import type { NotificationEvent, NotificationPreferences, Offer, PushToken, VaultItem, VaultUser } from "@/lib/types";

export const defaultNotificationPrefs: NotificationPreferences = {
  notifyPriceAth: true,
  notifyPriceUpPct: 10,
  notifyPriceDownPct: 15,
  notifyMarketMoves: true,
  notifyOfferReceived: true,
  notifyDigestDaily: false,
  notifyDigestWeekly: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00"
};

export function buildNotificationEvents({
  user,
  items,
  offers,
  prefs,
  existingEvents
}: {
  user: VaultUser;
  items: VaultItem[];
  offers: Offer[];
  prefs: NotificationPreferences;
  existingEvents: NotificationEvent[];
}) {
  if (isQuietHours(new Date(), prefs)) return [];

  const now = new Date().toISOString();
  const events: NotificationEvent[] = [];
  const sentToday = existingEvents.filter((event) => event.userId === user.id && event.createdAt.slice(0, 10) === now.slice(0, 10));
  const sentByItem = new Set(sentToday.map((event) => `${event.itemId}:${event.type}`));
  const dailyLimitRemaining = Math.max(0, 3 - sentToday.length);

  for (const item of items) {
    if (events.length >= dailyLimitRemaining) break;
    const daily = getItemDailyDelta(item);
    const dailyPct = daily.percentage * 100;
    const itemReturn = getItemReturn(item);
    const priorHigh = Math.max(...item.priceHistory.slice(0, -1).map((point) => point.value), item.costBasis);

    if (prefs.notifyPriceAth && item.currentValueUser > priorHigh && !sentByItem.has(`${item.id}:ATH`)) {
      events.push(notification(user.id, "ATH", "New all-time high", `Your ${item.name} just hit ${money(item.currentValueUser)} - a new personal record. Up ${Math.round(itemReturn.percentage * 100)}% from what you paid.`, item.id, "high", now));
      continue;
    }

    if (prefs.notifyMarketMoves && dailyPct > prefs.notifyPriceUpPct && !sentByItem.has(`${item.id}:PRICE_UP`)) {
      events.push(notification(user.id, "PRICE_UP", `${item.name} up ${Math.round(dailyPct)}% today`, `${item.name} jumped ${money(daily.amount)} today based on the latest PriceCharting guide sync. Current estimate: ${money(item.currentValueUser)}.`, item.id, "medium", now));
      continue;
    }

    if (prefs.notifyMarketMoves && dailyPct < -prefs.notifyPriceDownPct && !sentByItem.has(`${item.id}:PRICE_DOWN`)) {
      events.push(notification(user.id, "PRICE_DOWN", `${item.name} dipped ${Math.abs(Math.round(dailyPct))}% today`, `${item.name} dipped ${money(Math.abs(daily.amount))} based on recent sales. Estimated value: ${money(item.currentValueUser)}. Long-term holders often see temporary dips recover.`, item.id, "medium", now));
    }
  }

  if (prefs.notifyOfferReceived) {
    const offer = offers.find((candidate) => candidate.status === "pending" && !existingEvents.some((event) => event.type === "OFFER_RECEIVED" && event.itemId === candidate.itemId));
    const item = offer ? items.find((candidate) => candidate.id === offer.itemId) : undefined;
    if (offer && item && events.length < dailyLimitRemaining) {
      events.push(notification(user.id, "OFFER_RECEIVED", `Offer received on ${item.name}`, `@${offer.buyerUsername} offered ${money(offer.offerPrice)}. You can accept, decline, or counter from the offers inbox.`, item.id, "high", now));
    }
  }

  const milestone = crossedMilestone(items, user.totalValueCached);
  if (milestone && !existingEvents.some((event) => event.type === "MILESTONE" && event.title.includes(milestone.label))) {
    const metrics = getPortfolioMetrics(items);
    events.push(notification(user.id, "MILESTONE", `Your collection crossed ${milestone.label}`, `You've built a ${money(metrics.totalValue)} collection. You're now in the top ${milestone.percentile}% of Vault collectors.`, undefined, "high", now));
  }

  return events.slice(0, dailyLimitRemaining);
}

export function buildWeeklyDigest(user: VaultUser, items: VaultItem[]) {
  const metrics = getPortfolioMetrics(items);
  const movers = [...items].sort((a, b) => getItemDailyDelta(b).amount - getItemDailyDelta(a).amount).slice(0, 3);
  const athItems = items.filter((item) => item.currentValueUser >= Math.max(...item.priceHistory.map((point) => point.value)));
  return {
    subject: `Your Vault this week: ${metrics.totalReturn >= 0 ? "+" : ""}${money(metrics.totalReturn)}`,
    portfolioLine: `${money(metrics.totalValue)} total value, ${metrics.totalReturn >= 0 ? "+" : ""}${money(metrics.totalReturn)} all-time.`,
    movers,
    athItems,
    insight: `${user.username}, your best performer is ${metrics.bestPerformer.name}, up ${Math.round(getItemReturn(metrics.bestPerformer).percentage * 100)}% from cost basis.`
  };
}

export function createMockWebPushToken(userId: string): PushToken {
  const now = new Date().toISOString();
  return {
    id: `push-web-${Date.now()}`,
    userId,
    token: `web-push-placeholder-${Date.now()}`,
    platform: "web",
    createdAt: now,
    lastUsedAt: now
  };
}

export function isQuietHours(date: Date, prefs: NotificationPreferences) {
  const current = minutes(date.toTimeString().slice(0, 5));
  const start = minutes(prefs.quietHoursStart);
  const end = minutes(prefs.quietHoursEnd);
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function notification(userId: string, type: NotificationEvent["type"], title: string, body: string, itemId: string | undefined, priority: NotificationEvent["priority"], createdAt: string): NotificationEvent {
  return {
    id: `notification-${type.toLowerCase()}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    userId,
    type,
    title,
    body,
    itemId,
    priority,
    channel: "in_app",
    status: "queued",
    createdAt
  };
}

function crossedMilestone(items: VaultItem[], previousTotal: number) {
  const metrics = getPortfolioMetrics(items);
  return valueMilestones.find((milestone) => previousTotal < milestone.value && metrics.totalValue >= milestone.value);
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}
