alter table public.items
  add column if not exists pricecharting_id text,
  add column if not exists pricecharting_console text,
  add column if not exists pricecharting_price_field text,
  add column if not exists pricecharting_last_sync_at timestamptz;

create table if not exists public.price_cache (
  id uuid primary key default gen_random_uuid(),
  item_identifier text not null unique,
  source text not null default 'pricecharting',
  market_value numeric(12,2),
  price_low numeric(12,2),
  price_high numeric(12,2),
  last_sale_price numeric(12,2),
  confidence text not null default 'NONE',
  raw_response jsonb,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '24 hours'
);

create index if not exists price_cache_item_identifier_idx on public.price_cache(item_identifier);
create index if not exists price_cache_expires_at_idx on public.price_cache(expires_at);
create index if not exists items_pricecharting_id_idx on public.items(pricecharting_id);

alter table public.price_cache enable row level security;

drop policy if exists "price cache public read" on public.price_cache;
create policy "price cache public read" on public.price_cache for select using (true);
