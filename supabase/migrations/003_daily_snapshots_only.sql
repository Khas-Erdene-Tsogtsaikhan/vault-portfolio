create table if not exists public.item_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  pricecharting_id text,
  condition_field text,
  value numeric(12,2) not null default 0,
  previous_value numeric(12,2),
  delta numeric(12,2) not null default 0,
  delta_pct numeric not null default 0,
  source text not null default 'pricecharting',
  snapshot_date date not null default current_date,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (item_id, snapshot_date)
);

create index if not exists item_price_snapshots_item_date_idx
  on public.item_price_snapshots(item_id, snapshot_date desc);

create index if not exists item_price_snapshots_user_date_idx
  on public.item_price_snapshots(user_id, snapshot_date desc);

alter table public.portfolio_snapshots
  add column if not exists total_gain numeric not null default 0,
  add column if not exists total_gain_pct numeric not null default 0,
  add column if not exists daily_delta numeric not null default 0,
  add column if not exists daily_delta_pct numeric not null default 0;

alter table public.item_price_snapshots enable row level security;

drop policy if exists "item snapshots own rows" on public.item_price_snapshots;
create policy "item snapshots own rows" on public.item_price_snapshots
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.items i
      where i.id = item_id and i.user_id = auth.uid()
    )
  );

-- Guardrail: the full PriceCharting catalog must not live in Supabase.
-- Catalog search belongs in Meilisearch/Typesense; Supabase stores only user-owned portfolio data.
drop table if exists public.pricecharting_catalog cascade;
drop table if exists public.catalog_sync_runs cascade;
drop function if exists public.search_pricecharting_catalog(text, integer) cascade;
drop function if exists public.update_catalog_search_vector() cascade;
