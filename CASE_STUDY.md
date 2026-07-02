# Case Study: VAULT Collection OS

## Problem

Collectors often manage valuable physical assets through fragmented tools: spreadsheets, photos, marketplace tabs, receipts, memory, and manual price checks. That makes it hard to answer basic questions:

- What is my collection worth right now?
- Which categories are moving?
- Which items have documentation gaps?
- Which positions are liquid, rare, or under-tracked?

VAULT explores what happens when physical collections are treated like a portfolio product.

## Users

The target user is a collector with enough assets that organization, valuation, and documentation begin to matter: watches, trading cards, sneakers, wine, art, games, or other high-signal collections.

## Constraints

- Collector item data is messy and category-specific
- Valuation data can be stale, incomplete, or source-dependent
- The UI needs to feel premium enough for valuable objects
- Catalog search should be fast without turning the primary database into a dumping ground
- The product needs operational loops, not only static screens

## What I built

- A Next.js collection dashboard with portfolio value, item counts, category performance, and market indicators
- A collection table for filtering, sorting, searching, and inspecting positions
- Position detail pages with valuation, return, liquidity, document coverage, and sale context
- Supabase-backed app state for collection data and user-owned records
- Meilisearch-backed market lookup using external collector catalog data
- TypeScript automation scripts for catalog seeding, price syncing, image enrichment, daily refresh, and digest flows
- A polished visual system designed to feel closer to a financial/product dashboard than a hobby tracker

## Technical architecture

The system separates user-owned app data from external catalog/search data:

- Supabase stores user and collection state
- Meilisearch indexes the collector catalog for fast lookup
- PriceCharting-style market data informs valuation context
- TypeScript scripts keep catalog and market data refreshed
- Resend supports email/digest workflows

This separation keeps the app flexible: the primary database stays clean while catalog search can evolve independently.

## Hardest technical problem

The hardest product problem is trust: valuation dashboards are only useful if users understand where numbers come from and when they might be stale. The architecture is designed so valuation sources, refresh jobs, and market metadata can become explicit product surfaces rather than hidden implementation details.

## Tradeoffs

- Meilisearch adds infrastructure complexity, but it keeps large catalog search fast and separate from user data
- Next.js gives fast full-stack iteration, but scripts and scheduled jobs need careful operational boundaries
- A premium UI takes longer than plain CRUD, but trust and taste matter for a product around valuable physical assets

## Results

- Live product: https://vaultcollection.org
- Public repo now documents architecture, setup, ownership, and product rationale
- Demonstrates product design, full-stack engineering, data workflows, and operational thinking

## What I learned

A strong product is not only a UI or a database. VAULT forced the system to connect product psychology, data modeling, market data ingestion, and operational refresh loops into one coherent experience.

## What I would build next

- Historical portfolio timeline and value snapshots
- Data freshness/confidence indicators
- CSV/spreadsheet import
- OCR/document intelligence for receipts and provenance
- More explicit test/eval coverage for valuation matching quality
