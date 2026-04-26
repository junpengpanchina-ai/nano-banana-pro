-- 记录每次生成所选宽高比与画质（便于后台与排错）
alter table public.image_jobs
  add column if not exists aspect_ratio text,
  add column if not exists image_size text;
