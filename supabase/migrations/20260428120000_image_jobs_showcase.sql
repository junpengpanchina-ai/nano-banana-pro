-- 首页「精选展示」：运营 / 后续管理后台将优秀出图 is_showcase = true，首页用 service 拉取
alter table public.image_jobs
  add column if not exists is_showcase boolean not null default false;

create index if not exists image_jobs_showcase_idx
  on public.image_jobs (created_at desc)
  where is_showcase = true and status = 'succeeded';
