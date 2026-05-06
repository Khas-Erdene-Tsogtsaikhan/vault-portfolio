create extension if not exists "pg_trgm";

create table if not exists public.pricecharting_catalog (
  id uuid primary key default gen_random_uuid(),
  pricecharting_id text not null unique,
  product_name text not null,
  console_name text,
  category text,
  loose_price integer,
  cib_price integer,
  new_price integer,
  graded_price integer,
  psa_10_price integer,
  box_only_price integer,
  manual_only_price integer,
  price_fields jsonb not null default '{}'::jsonb,
  sales_volume integer not null default 0,
  price_low integer,
  price_high integer,
  image_url text,
  image_source text,
  upc text,
  asin text,
  epid text,
  release_date date,
  raw_row jsonb not null default '{}'::jsonb,
  search_vector tsvector,
  last_synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create or replace function public.update_catalog_search_vector()
returns trigger as $$
begin
  new.search_vector := to_tsvector(
    'simple',
    coalesce(new.product_name, '') || ' ' ||
    coalesce(new.console_name, '') || ' ' ||
    coalesce(new.category, '')
  );
  return new;
end;
$$ language plpgsql;

drop trigger if exists catalog_search_vector_update on public.pricecharting_catalog;
create trigger catalog_search_vector_update
  before insert or update on public.pricecharting_catalog
  for each row execute function public.update_catalog_search_vector();

create index if not exists idx_catalog_search on public.pricecharting_catalog using gin(search_vector);
create index if not exists idx_catalog_name_trgm on public.pricecharting_catalog using gin(product_name gin_trgm_ops);
create index if not exists idx_catalog_console_trgm on public.pricecharting_catalog using gin(console_name gin_trgm_ops);
create index if not exists idx_catalog_category on public.pricecharting_catalog(category);
create index if not exists idx_catalog_sales on public.pricecharting_catalog(sales_volume desc);
create index if not exists idx_catalog_last_synced on public.pricecharting_catalog(last_synced_at desc);

create table if not exists public.catalog_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'pricecharting_csv',
  status text not null default 'running' check (status in ('running','completed','failed')),
  rows_seen integer not null default 0,
  rows_upserted integer not null default 0,
  rows_failed integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.item_price_snapshots (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  pricecharting_id text,
  condition_field text,
  value numeric not null default 0,
  previous_value numeric,
  delta numeric not null default 0,
  delta_pct numeric not null default 0,
  source text not null default 'pricecharting_catalog',
  snapshot_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (item_id, snapshot_date)
);

create index if not exists idx_item_snapshots_item_date on public.item_price_snapshots(item_id, snapshot_date desc);
create index if not exists idx_item_snapshots_user_date on public.item_price_snapshots(user_id, snapshot_date desc);

alter table public.portfolio_snapshots
  add column if not exists total_gain numeric not null default 0,
  add column if not exists total_gain_pct numeric not null default 0,
  add column if not exists daily_delta numeric not null default 0,
  add column if not exists daily_delta_pct numeric not null default 0;

alter table public.pricecharting_catalog enable row level security;
alter table public.catalog_sync_runs enable row level security;
alter table public.item_price_snapshots enable row level security;

drop policy if exists "catalog public read" on public.pricecharting_catalog;
create policy "catalog public read" on public.pricecharting_catalog for select using (true);

drop policy if exists "item snapshots own rows" on public.item_price_snapshots;
create policy "item snapshots own rows" on public.item_price_snapshots
  for select using (auth.uid() = user_id);

create or replace function public.search_pricecharting_catalog(search_query text, result_limit integer default 100)
returns table (
  pricecharting_id text,
  product_name text,
  console_name text,
  category text,
  loose_price integer,
  cib_price integer,
  new_price integer,
  graded_price integer,
  psa_10_price integer,
  box_only_price integer,
  manual_only_price integer,
  price_fields jsonb,
  sales_volume integer,
  price_low integer,
  price_high integer,
  image_url text,
  image_source text,
  upc text,
  asin text,
  epid text,
  release_date date,
  last_synced_at timestamptz
)
language sql
stable
as $$
  select
    c.pricecharting_id,
    c.product_name,
    c.console_name,
    c.category,
    c.loose_price,
    c.cib_price,
    c.new_price,
    c.graded_price,
    c.psa_10_price,
    c.box_only_price,
    c.manual_only_price,
    c.price_fields,
    c.sales_volume,
    c.price_low,
    c.price_high,
    c.image_url,
    c.image_source,
    c.upc,
    c.asin,
    c.epid,
    c.release_date,
    c.last_synced_at
  from public.pricecharting_catalog c
  where
    length(trim(search_query)) > 0
    and (
      c.search_vector @@ plainto_tsquery('simple', search_query)
      or c.product_name ilike '%' || search_query || '%'
      or c.console_name ilike '%' || search_query || '%'
      or c.upc = search_query
      or c.asin = search_query
      or c.epid = search_query
    )
  order by
    case when c.product_name ilike search_query || '%' then 0 else 1 end,
    ts_rank_cd(c.search_vector, plainto_tsquery('simple', search_query)) desc,
    similarity(c.product_name, search_query) desc,
    c.sales_volume desc nulls last,
    c.product_name asc
  limit greatest(1, least(coalesce(result_limit, 100), 250));
$$;
