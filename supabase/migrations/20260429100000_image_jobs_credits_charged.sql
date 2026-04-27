-- 记录单次生成实际扣除的积分（与 profiles.balance_images 语义一致：积分制）
alter table public.image_jobs
  add column if not exists credits_charged integer;

comment on column public.image_jobs.credits_charged is '成功生成时从 profiles.balance_images 扣除的积分数';
