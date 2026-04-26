import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGenerationBucket } from "@/lib/storage/generation-bucket";
import { REFERENCE_IMAGE_SIGN_TTL_SECONDS } from "@/lib/storage/reference-sign-ttl";

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map([
  ["image/jpeg", "jpg"],
  ["image/jpg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function extForMime(mime: string): string | null {
  const m = mime.toLowerCase().split(";")[0]?.trim() ?? "";
  return ALLOWED.get(m) ?? null;
}

export async function uploadUserReferenceImage(
  admin: SupabaseClient,
  userId: string,
  data: ArrayBuffer,
  mimeType: string,
): Promise<{ ok: true; signedUrl: string; storagePath: string } | { ok: false; error: string }> {
  const ext = extForMime(mimeType);
  if (!ext) {
    return { ok: false, error: "仅支持 JPG、PNG、WEBP" };
  }
  if (data.byteLength > MAX_BYTES) {
    return { ok: false, error: "单张图片不超过 10MB" };
  }

  const bucket = getGenerationBucket();
  const storagePath = `${userId}/refs/${randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, data, {
    contentType: mimeType.split(";")[0]?.trim() || `image/${ext === "jpg" ? "jpeg" : ext}`,
    upsert: false,
  });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data: signed, error: signError } = await admin.storage
    .from(bucket)
    .createSignedUrl(storagePath, REFERENCE_IMAGE_SIGN_TTL_SECONDS);

  if (signError || !signed?.signedUrl) {
    return { ok: false, error: signError?.message ?? "无法生成访问链接" };
  }

  return { ok: true, signedUrl: signed.signedUrl, storagePath };
}
