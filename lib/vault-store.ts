"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoItems, demoListings, demoOffers, demoUser, demoWatchlist } from "@/lib/demo-data";
import { buildNotificationEvents, createMockWebPushToken, defaultNotificationPrefs } from "@/lib/notifications";
import { getTier } from "@/lib/portfolio-utils";
import { addProofFilesToSupabaseItem, addVaultItemToSupabase, deleteSupabasePhoto, insertSupabaseNotificationEvents, insertSupabasePushToken, loadVaultFromSupabase, setSupabaseOpenToOffers, updateSupabaseEstimate, updateSupabaseItemDetails, updateSupabaseNotificationPrefs } from "@/lib/supabase-db";
import { supabase } from "@/lib/supabase";
import type { Category, Listing, MarketSearchResult, NotificationEvent, NotificationPreferences, Offer, PushToken, VaultDocument, VaultItem, VaultPhoto, VaultUser, WatchlistItem } from "@/lib/types";

export interface NewVaultItemInput {
  name: string;
  category: Category;
  brand: string;
  referenceNumber?: string;
  editionNumber?: number;
  editionTotal?: number;
  condition: string;
  costBasis: number;
  acquiredDate: string;
  acquiredFrom?: string;
  notes: string;
  story: string;
  currentValueUser: number;
  currentValueMarket?: number;
  ebaySearchQuery?: string;
  ebayReference?: string;
  priceLow?: number;
  priceHigh?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  priceSampleSize?: number;
  priceConfidence?: VaultItem["priceConfidence"];
  photoUrls?: string[];
  photoFiles: File[];
  documentFiles: Array<{ file: File; type: VaultDocument["type"] }>;
}

interface VaultState {
  user: VaultUser;
  items: VaultItem[];
  listings: Listing[];
  offers: Offer[];
  watchlist: WatchlistItem[];
  notificationPrefs: NotificationPreferences;
  notificationEvents: NotificationEvent[];
  pushTokens: PushToken[];
  authStatus: "demo" | "loading" | "authenticated" | "error";
  authError?: string;
  lastAddedItemId?: string;
  dismissedMilestoneValue?: number;
  loadRemoteVault: () => Promise<void>;
  resetToDemo: () => void;
  addItem: (input: NewVaultItemInput) => Promise<VaultItem>;
  addProofFiles: (itemId: string, photoFiles: File[], documentFiles: Array<{ file: File; type: VaultDocument["type"] }>) => Promise<void>;
  removePhoto: (itemId: string, photoId: string) => Promise<void>;
  updateItemDetails: (itemId: string, input: Partial<Pick<VaultItem, "name" | "brand" | "referenceNumber" | "condition" | "costBasis" | "currentValueUser" | "acquiredDate" | "acquiredFrom" | "notes" | "story">>) => Promise<void>;
  updateEstimate: (itemId: string, value: number) => Promise<void>;
  toggleOpenToOffers: (itemId: string, enabled: boolean, floorPrice?: number) => Promise<void>;
  updateOfferFloor: (itemId: string, floorPrice?: number) => void;
  watchMarketItem: (result: MarketSearchResult, targetPrice?: number) => void;
  unwatchItem: (watchId: string) => void;
  createOffer: (itemId: string, offerPrice: number, message?: string) => void;
  updateOfferStatus: (offerId: string, status: Offer["status"], counterPrice?: number) => void;
  updateNotificationPrefs: (prefs: Partial<NotificationPreferences>) => void;
  enableWebPush: () => void;
  runNotificationChecks: () => NotificationEvent[];
  markNotificationRead: (eventId: string) => void;
  dismissMilestone: (value: number) => void;
}

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      user: demoUser,
      items: demoItems,
      listings: demoListings,
      offers: demoOffers,
      watchlist: demoWatchlist,
      notificationPrefs: defaultNotificationPrefs,
      notificationEvents: [],
      pushTokens: [],
      authStatus: "demo",
      loadRemoteVault: async () => {
        if (!supabase) {
          set({ authStatus: "demo", authError: undefined });
          return;
        }
        set({ authStatus: "loading", authError: undefined });
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          set({ authStatus: "demo", authError: undefined });
          return;
        }
        try {
          const remote = await loadVaultFromSupabase(data.user);
          set({ ...remote, authStatus: "authenticated", authError: undefined, lastAddedItemId: undefined });
        } catch (loadError) {
          set({ authStatus: "error", authError: loadError instanceof Error ? loadError.message : "Could not load Supabase vault." });
        }
      },
      resetToDemo: () => set({
        user: demoUser,
        items: demoItems,
        listings: demoListings,
        offers: demoOffers,
        watchlist: demoWatchlist,
        notificationPrefs: defaultNotificationPrefs,
        notificationEvents: [],
        pushTokens: [],
        authStatus: "demo",
        authError: undefined,
        lastAddedItemId: undefined
      }),
      addItem: async (input) => {
        const state = get();
        if (supabase && state.authStatus === "authenticated" && state.user.id !== demoUser.id) {
          const item = await addVaultItemToSupabase(input, state.user);
          const items = [item, ...get().items];
          const totalValue = items.reduce((sum, vaultItem) => sum + (vaultItem.currentValueMarket ?? vaultItem.currentValueUser), 0);
          set((current) => ({
            items,
            lastAddedItemId: item.id,
            user: { ...current.user, tier: getTier(totalValue), totalItems: items.length, totalValueCached: totalValue, streakMonths: Math.max(current.user.streakMonths, 1) }
          }));
          return item;
        }
        const now = new Date().toISOString();
        const id = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now()}`;
        const photoSources = input.photoUrls?.length ? input.photoUrls : input.photoFiles.length ? input.photoFiles.map((file) => file.name) : ["https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1200&q=80"];
        const photos: VaultPhoto[] = photoSources.slice(0, 6).map((filename, index) => ({
          id: `${id}-photo-${index + 1}`,
          itemId: id,
          url: filename.startsWith("http") ? filename : "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1200&q=80",
          order: index + 1,
          isPrimary: index === 0,
          createdAt: now
        }));
        const documents: VaultDocument[] = input.documentFiles.map((document, index) => ({
          id: `${id}-doc-${index + 1}`,
          itemId: id,
          url: "#",
          filename: document.file.name,
          type: document.type,
          uploadedAt: now
        }));
        const item: VaultItem = {
          id,
          userId: get().user.id,
          name: input.name,
          category: input.category,
          brand: input.brand,
          referenceNumber: input.referenceNumber,
          editionNumber: input.editionNumber,
          editionTotal: input.editionTotal,
          condition: input.condition,
          costBasis: input.costBasis,
          currency: "USD",
          acquiredDate: input.acquiredDate,
          acquiredFrom: input.acquiredFrom,
          notes: input.notes,
          story: input.story,
          currentValueUser: input.currentValueUser,
          currentValueMarket: input.currentValueMarket,
          currentValueSource: input.currentValueMarket ? "eBay Sold Listings" : "Your estimate",
          currentValueUpdatedAt: now,
          value24hAgo: input.currentValueUser,
          ebaySearchQuery: input.ebaySearchQuery,
          ebayReference: input.ebayReference,
          priceLow: input.priceLow,
          priceHigh: input.priceHigh,
          lastSalePrice: input.lastSalePrice,
          lastSaleDate: input.lastSaleDate,
          priceSampleSize: input.priceSampleSize,
          priceConfidence: input.priceConfidence,
          listingStatus: "none",
          isSold: false,
          createdAt: now,
          updatedAt: now,
          photos,
          documents,
          priceHistory: [
            { id: `${id}-basis`, itemId: id, value: input.costBasis, source: "user", recordedAt: input.acquiredDate },
            { id: `${id}-now`, itemId: id, value: input.currentValueUser, source: "user", recordedAt: now }
          ],
          marketComps: []
        };
        const items = [item, ...get().items];
        const totalValue = items.reduce((sum, vaultItem) => sum + vaultItem.currentValueUser, 0);
        set((state) => ({
          items,
          lastAddedItemId: item.id,
          user: {
            ...state.user,
            tier: getTier(totalValue),
            totalItems: items.length,
            totalValueCached: totalValue,
            streakMonths: Math.max(state.user.streakMonths, 1)
          }
        }));
        return item;
      },
      addProofFiles: async (itemId, photoFiles, documentFiles) => {
        const now = new Date().toISOString();
        const state = get();
        if (supabase && state.authStatus === "authenticated" && state.user.id !== demoUser.id) {
          const additions = await addProofFilesToSupabaseItem(itemId, state.user.id, photoFiles, documentFiles);
          set((current) => ({
            items: current.items.map((item) =>
              item.id === itemId
                ? { ...item, photos: [...item.photos, ...additions.photos], documents: [...additions.documents, ...item.documents], updatedAt: now }
                : item
            )
          }));
          return;
        }
        set((current) => ({
          items: current.items.map((item) => {
            if (item.id !== itemId) return item;
            const photos = photoFiles.map((file, index) => ({
              id: `${itemId}-local-photo-${Date.now()}-${index}`,
              itemId,
              url: "https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?auto=format&fit=crop&w=1200&q=80",
              order: item.photos.length + index + 1,
              isPrimary: item.photos.length === 0 && index === 0,
              createdAt: now
            }));
            const documents = documentFiles.map((document, index) => ({
              id: `${itemId}-local-doc-${Date.now()}-${index}`,
              itemId,
              url: "#",
              filename: document.file.name,
              type: document.type,
              uploadedAt: now
            }));
            return { ...item, photos: [...item.photos, ...photos], documents: [...documents, ...item.documents], updatedAt: now };
          })
        }));
      },
      removePhoto: async (itemId, photoId) => {
        if (supabase && get().authStatus === "authenticated" && get().user.id !== demoUser.id) {
          await deleteSupabasePhoto(photoId);
        }
        set((state) => ({
          items: state.items.map((item) => item.id === itemId ? { ...item, photos: item.photos.filter((photo) => photo.id !== photoId), updatedAt: new Date().toISOString() } : item)
        }));
      },
      updateItemDetails: async (itemId, input) => {
        const now = new Date().toISOString();
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  ...input,
                  currentValueUpdatedAt: input.currentValueUser !== undefined ? now : item.currentValueUpdatedAt,
                  updatedAt: now,
                  priceHistory: input.currentValueUser !== undefined && input.currentValueUser !== item.currentValueUser
                    ? [...item.priceHistory, { id: `${itemId}-edit-${Date.now()}`, itemId, value: input.currentValueUser, source: "user", recordedAt: now }]
                    : item.priceHistory
                }
              : item
          )
        }));
        if (supabase && get().authStatus === "authenticated" && get().user.id !== demoUser.id) {
          await updateSupabaseItemDetails(itemId, input);
        }
      },
      updateEstimate: async (itemId, value) => {
        const now = new Date().toISOString();
        set((state) => ({
          items: state.items.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  currentValueUser: value,
                  currentValueUpdatedAt: now,
                  updatedAt: now,
                  priceHistory: [...item.priceHistory, { id: `${itemId}-estimate-${Date.now()}`, itemId, value, source: "user", recordedAt: now }]
                }
              : item
          )
        }));
        if (supabase && get().authStatus === "authenticated" && get().user.id !== demoUser.id) {
          await updateSupabaseEstimate(itemId, value);
        }
      },
      toggleOpenToOffers: async (itemId, enabled, floorPrice) => {
        const now = new Date().toISOString();
        const currentItem = get().items.find((item) => item.id === itemId);
        if (supabase && get().authStatus === "authenticated" && get().user.id !== demoUser.id && currentItem) {
          await setSupabaseOpenToOffers(currentItem, get().user, enabled, floorPrice);
        }
        set((state) => {
          const existing = state.listings.find((listing) => listing.itemId === itemId);
          const listing: Listing = existing
            ? { ...existing, askingPrice: floorPrice, status: enabled ? "open_to_offers" : "removed", updatedAt: now }
            : { id: `listing-${itemId}-${Date.now()}`, itemId, sellerUserId: state.user.id, askingPrice: floorPrice, status: "open_to_offers", createdAt: now, updatedAt: now };
          return {
            items: state.items.map((item) => item.id === itemId ? { ...item, listingStatus: enabled ? "open_to_offers" : "none", offerFloorPrice: enabled ? floorPrice : undefined, updatedAt: now } : item),
            listings: existing ? state.listings.map((candidate) => candidate.id === existing.id ? listing : candidate) : [listing, ...state.listings]
          };
        });
      },
      updateOfferFloor: (itemId, floorPrice) => {
        const now = new Date().toISOString();
        set((state) => ({
          items: state.items.map((item) => item.id === itemId ? { ...item, offerFloorPrice: floorPrice, updatedAt: now } : item),
          listings: state.listings.map((listing) => listing.itemId === itemId ? { ...listing, askingPrice: floorPrice, updatedAt: now } : listing)
        }));
      },
      watchMarketItem: (result, targetPrice) => {
        const now = new Date().toISOString();
        set((state) => {
          if (state.watchlist.some((item) => item.itemIdentifier === result.id)) return state;
          const watch: WatchlistItem = {
            id: `watch-${result.id}-${Date.now()}`,
            userId: state.user.id,
            itemIdentifier: result.id,
            name: result.title,
            category: result.category,
            imageUrl: result.imageUrl,
            currentPrice: result.price,
            value24hAgo: Math.round(result.price * 0.992),
            value7dAgo: Math.round(result.price * 0.955),
            watchers: result.soldCount ? result.soldCount * 9 : 124,
            status: "not_for_sale",
            targetPrice,
            alertPreferences: { acceptedOffer: true, priceBelow: targetPrice, listed: true },
            createdAt: now
          };
          return { watchlist: [watch, ...state.watchlist] };
        });
      },
      unwatchItem: (watchId) => set((state) => ({ watchlist: state.watchlist.filter((item) => item.id !== watchId) })),
      createOffer: (itemId, offerPrice, message) => {
        const now = new Date().toISOString();
        set((state) => {
          const listing = state.listings.find((candidate) => candidate.itemId === itemId && candidate.status === "open_to_offers");
          if (!listing) return state;
          const offer: Offer = { id: `offer-${Date.now()}`, itemId, listingId: listing.id, buyerUsername: "vault_member", offerPrice, message, status: "pending", createdAt: now, updatedAt: now };
          return { offers: [offer, ...state.offers] };
        });
      },
      updateOfferStatus: (offerId, status, counterPrice) => {
        const now = new Date().toISOString();
        set((state) => ({
          offers: state.offers.map((offer) =>
            offer.id === offerId
              ? { ...offer, status, offerPrice: counterPrice ?? offer.offerPrice, updatedAt: now }
              : offer
          )
        }));
      },
      updateNotificationPrefs: (prefs) => {
        set((state) => ({ notificationPrefs: { ...(state.notificationPrefs ?? defaultNotificationPrefs), ...prefs } }));
        if (supabase && get().authStatus === "authenticated" && get().user.id !== demoUser.id) {
          void updateSupabaseNotificationPrefs(get().user.id, prefs);
        }
      },
      enableWebPush: () => {
        const fallback = createMockWebPushToken(get().user.id);
        set((state) => ({ pushTokens: state.pushTokens?.length ? state.pushTokens : [fallback] }));
        if (supabase && get().authStatus === "authenticated" && get().user.id !== demoUser.id) {
          void insertSupabasePushToken(get().user.id, fallback.token, "web").then((token) => set({ pushTokens: [token] }));
        }
      },
      runNotificationChecks: () => {
        const state = get();
        const events = buildNotificationEvents({
          user: state.user,
          items: state.items,
          offers: state.offers,
          prefs: state.notificationPrefs ?? defaultNotificationPrefs,
          existingEvents: state.notificationEvents ?? []
        });
        if (events.length) {
          set((current) => ({ notificationEvents: [...events, ...(current.notificationEvents ?? [])] }));
          if (supabase && state.authStatus === "authenticated" && state.user.id !== demoUser.id) {
            void insertSupabaseNotificationEvents(events);
          }
        }
        return events;
      },
      markNotificationRead: (eventId) => {
        const now = new Date().toISOString();
        set((state) => ({
          notificationEvents: (state.notificationEvents ?? []).map((event) => event.id === eventId ? { ...event, readAt: now } : event)
        }));
      },
      dismissMilestone: (value) => set({ dismissedMilestoneValue: value })
    }),
    { name: "vault-phase-one" }
  )
);
