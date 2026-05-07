alter table public.profiles
  add column if not exists timezone text not null default 'America/New_York',
  add column if not exists email_unsubscribe_token uuid not null default gen_random_uuid(),
  add column if not exists email_unsubscribed_at timestamptz;

create unique index if not exists profiles_email_unsubscribe_token_idx
  on public.profiles(email_unsubscribe_token);

create table if not exists public.email_sends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  send_type text not null,
  subject text not null,
  resend_id text,
  status text not null default 'sent' check (status in ('sent','skipped','failed')),
  send_date date not null default current_date,
  sent_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists email_sends_user_sent_idx
  on public.email_sends(user_id, sent_at desc);

create unique index if not exists email_sends_one_sent_per_user_day_idx
  on public.email_sends(user_id, send_date)
  where status = 'sent';

alter table public.email_sends enable row level security;

drop policy if exists "email sends own rows" on public.email_sends;
create policy "email sends own rows" on public.email_sends
  for select using (auth.uid() = user_id);
