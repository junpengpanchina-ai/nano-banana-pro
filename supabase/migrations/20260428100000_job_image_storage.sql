-- 本地持久化图片路径（用于签发 48h 签名 URL）
alter table public.image_jobs
  add column if not exists storage_path text;

-- Storage 桶请在 Supabase Dashboard → Storage 新建：
--   名称：generations（与 SUPABASE_GENERATION_BUCKET 一致，默认 generations）
--   Public：关闭（私有）
-- 或使用 SQL（需有足够权限）：
-- insert into storage.buckets (id, name, public, file_size_limit)
-- values ('generations', 'generations', false, 52428800)
-- on conflict (id) do nothing;
