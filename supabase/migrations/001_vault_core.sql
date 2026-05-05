create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text not null,
  avatar_url text,
  tier text not null default 'Collector',
  total_items integer not null default 0,
  total_value_cached numeric not null default 0,
  total_cost_basis_cached numeric not null default 0,
  streak_months integer not null default 0,
  last_active_at timestamptz default now(),
  notify_price_ath boolean not null default true,
  notify_price_up_pct integer not null default 10,
  notify_price_down_pct integer not null default 15,
  notify_market_moves boolean not null default true,
  notify_offer_received boolean not null default true,
  notify_digest_daily boolean not null default false,
  notify_digest_weekly boolean not null default true,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  subcategory text,
  brand text,
  model text,
  reference_number text,
  edition_number integer,
  edition_total integer,
  grade_service text,
  grade_value numeric,
  condition text,
  size text,
  cost_basis numeric not null default 0,
  currency text not null default 'USD',
  acquired_date date not null default current_date,
  acquired_from text,
  notes text,
  story text,
  current_value_user numeric not null default 0,
  current_value_market numeric,
  current_value_source text not null default 'Your estimate',
  current_value_updated_at timestamptz,
  value_24h_ago numeric,
  value_7d_ago numeric,
  value_30d_ago numeric,
  high_52w numeric,
  low_52w numeric,
  ebay_search_query text,
  ebay_reference text,
  price_low numeric,
  price_high numeric,
  last_sale_price numeric,
  last_sale_date timestamptz,
  price_sample_size integer,
  price_confidence text check (price_confidence in ('HIGH','MEDIUM','LOW','NONE')),
  listing_status text not null default 'none' check (listing_status in ('none','open_to_offers','listed','sold')),
  offer_floor_price numeric,
  is_sold boolean not null default false,
  sold_price numeric,
  sold_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  url text not null,
  "order" integer not null default 1,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  url text not null,
  filename text not null,
  doc_type text not null default 'other',
  uploaded_at timestamptz not null default now()
);

create table if not exists public.price_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  value numeric not null,
  source text not null default 'user',
  sample_size integer,
  price_low numeric,
  price_high numeric,
  source_detail text,
  recorded_at timestamptz not null default now()
);

create table if not exists public.portfolio_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  snapshot_date date not null default current_date,
  total_value numeric not null default 0,
  total_cost_basis numeric not null default 0,
  item_count integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, snapshot_date)
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  seller_user_id uuid not null references public.profiles(id) on delete cascade,
  asking_price numeric,
  condition_description text,
  ships_to text,
  status text not null default 'draft' check (status in ('draft','open_to_offers','active','sold','removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  buyer_user_id uuid references public.profiles(id) on delete set null,
  buyer_username text,
  offer_price numeric not null,
  message text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','countered','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_identifier text not null,
  name text not null,
  category text not null,
  image_url text,
  current_price numeric not null default 0,
  value_24h_ago numeric not null default 0,
  value_7d_ago numeric not null default 0,
  watchers integer not null default 0,
  status text not null default 'not_for_sale',
  target_price numeric,
  alert_preferences jsonb not null default '{"acceptedOffer":true,"listed":true}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('web','ios','android')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  item_id uuid references public.items(id) on delete cascade,
  priority text not null default 'medium',
  channel text not null default 'in_app',
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz
);

insert into storage.buckets (id, name, public)
values ('vault-photos', 'vault-photos', true),
       ('vault-documents', 'vault-documents', true)
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.photos enable row level security;
alter table public.documents enable row level security;
alter table public.price_history enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.listings enable row level security;
alter table public.offers enable row level security;
alter table public.watchlist enable row level security;
alter table public.push_tokens enable row level security;
alter table public.notification_events enable row level security;

create policy "profiles own rows" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "items own rows" on public.items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "photos via owned items" on public.photos for all using (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())) with check (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()));
create policy "documents via owned items" on public.documents for all using (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())) with check (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()));
create policy "price history via owned items" on public.price_history for all using (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid())) with check (exists (select 1 from public.items i where i.id = item_id and i.user_id = auth.uid()));
create policy "snapshots own rows" on public.portfolio_snapshots for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "listings own rows" on public.listings for all using (auth.uid() = seller_user_id) with check (auth.uid() = seller_user_id);
create policy "offers visible to seller or buyer" on public.offers for all using (auth.uid() = buyer_user_id or exists (select 1 from public.listings l where l.id = listing_id and l.seller_user_id = auth.uid())) with check (auth.uid() = buyer_user_id or exists (select 1 from public.listings l where l.id = listing_id and l.seller_user_id = auth.uid()));
create policy "watchlist own rows" on public.watchlist for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push tokens own rows" on public.push_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notification events own rows" on public.notification_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users upload own photos" on storage.objects for insert with check (bucket_id = 'vault-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users read own photos" on storage.objects for select using (bucket_id = 'vault-photos' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users upload own documents" on storage.objects for insert with check (bucket_id = 'vault-documents' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "users read own documents" on storage.objects for select using (bucket_id = 'vault-documents' and auth.uid()::text = (storage.foldername(name))[1]);
