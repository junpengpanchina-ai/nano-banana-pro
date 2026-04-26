import { createAdminClient } from "@/lib/supabase/admin";
import { createSignedUrlForStoragePath } from "@/lib/storage/persist-job-image";

type Row = {
  storage_path: string | null;
  image_url: string | null;
};

/** 列表页：有 Storage 则每次签发新的 48h 签名 URL */
export async function resolveJobImageHref(row: Row): Promise<string | null> {
  if (row.storage_path) {
    const admin = createAdminClient();
    const signed = await createSignedUrlForStoragePath(admin, row.storage_path);
    if (signed) return signed;
  }
  return row.image_url;
}
