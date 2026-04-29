-- 异步出图：在创建 pending 任务时固化扣费档位与参考图 URL，供 after() 后台继续执行
alter table public.image_jobs
  add column if not exists credit_cost integer,
  add column if not exists reference_signed_urls jsonb;

comment on column public.image_jobs.credit_cost is '创建任务时锁定的单次消耗积分数（与 credits_charged 成功时一致）';
comment on column public.image_jobs.reference_signed_urls is '创建任务时写入的参考图签名 URL 数组，供服务端后台继续调用上游';
