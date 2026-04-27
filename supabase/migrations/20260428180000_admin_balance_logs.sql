-- 运营后台：人工加减积分（张数）审计；用户可在 Dashboard 查看本人记录（RLS）。

create table public.admin_balance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta_images integer not null,
  balance_after integer not null check (balance_after >= 0),
  note text,
  operator_email text not null,
  created_at timestamptz not null default now()
);

create index admin_balance_logs_user_created_idx
  on public.admin_balance_logs (user_id, created_at desc);

create index admin_balance_logs_created_idx
  on public.admin_balance_logs (created_at desc);

alter table public.admin_balance_logs enable row level security;

-- 本人可见（用于 Dashboard 展示）；写入仅服务端 service_role
create policy "admin_balance_logs_select_own"
  on public.admin_balance_logs for select
  to authenticated
  using (auth.uid() = user_id);
