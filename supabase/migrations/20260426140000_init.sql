-- V1: profiles, image_jobs, recharge_records
-- Run in Supabase SQL Editor or via CLI: supabase db push

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  balance_images integer not null default 0 check (balance_images >= 0),
  created_at timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);

-- ---------------------------------------------------------------------------
-- image_jobs
-- ---------------------------------------------------------------------------
create table public.image_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt text not null,
  model text not null,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  image_url text,
  upstream_request_id text,
  price_cny numeric(12, 4) not null default 0.6,
  cost_cny numeric(12, 4),
  error_message text,
  created_at timestamptz not null default now()
);

create index image_jobs_user_created_idx on public.image_jobs (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- recharge_records (manual top-up; insert via SQL or service role)
-- ---------------------------------------------------------------------------
create table public.recharge_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_cny numeric(12, 4) not null,
  images_added integer not null check (images_added > 0),
  payment_method text not null,
  note text,
  created_at timestamptz not null default now()
);

create index recharge_records_user_idx on public.recharge_records (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- New auth user -> profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, balance_images)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    0
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Prevent clients from changing balance_images (service_role bypass)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_profile_balance_immutable_for_users()
returns trigger
language plpgsql
as $$
declare
  jwt_role text;
begin
  jwt_role := coalesce(
    nullif(trim(current_setting('request.jwt.claims', true)::json ->> 'role'), ''),
    ''
  );
  if jwt_role = 'service_role' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.balance_images is distinct from old.balance_images then
    raise exception 'balance_images can only be updated by the server';
  end if;
  return new;
end;
$$;

create trigger profiles_balance_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_balance_immutable_for_users();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.image_jobs enable row level security;
alter table public.recharge_records enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

-- Allow nickname updates only; balance guarded by trigger above.
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "image_jobs_select_own"
  on public.image_jobs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "recharge_select_own"
  on public.recharge_records for select
  to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Manual recharge example (run in SQL editor as postgres / service):
--
-- insert into public.recharge_records (user_id, amount_cny, images_added, payment_method, note)
-- values ('<user-uuid>', 6.00, 10, 'wechat', 'friend prepaid');
--
-- update public.profiles set balance_images = balance_images + 10 where id = '<user-uuid>';
-- ---------------------------------------------------------------------------
