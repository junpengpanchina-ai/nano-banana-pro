import type { SupabaseClient } from "@supabase/supabase-js";
import { getGenerationBucket, STORAGE_IMAGE_TTL_SECONDS } from "@/lib/storage/generation-bucket";

const MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;

function extFromContentType(ct: string): { ext: string; mime: string } {
  const lower = ct.toLowerCase();
  if (lower.includes("webp")) return { ext: "webp", mime: "image/webp" };
  if (lower.includes("jpeg") || lower.includes("jpg")) return { ext: "jpg", mime: "image/jpeg" };
  if (lower.includes("png")) return { ext: "png", mime: "image/png" };
  return { ext: "png", mime: "image/png" };
}

export type PersistImageResult =
  | { ok: true; storagePath: string; displayUrl: string }
  | { ok: false; fallbackUrl: string; reason: string };

/**
 * 从上游临时 URL 拉取并写入 Supabase Storage，返回 48h 内有效的签名访问地址。
 * 失败时仍用上游 URL 作为 fallback（由调用方写入 image_url）。
 */
export async function persistJobImageToStorage(
  admin: SupabaseClient,
  userId: string,
  jobId: string,
  remoteUrl: string,
): Promise<PersistImageResult> {
  const bucket = getGenerationBucket();

  try {
    const res = await fetch(remoteUrl, { redirect: "follow" });
    if (!res.ok) {
      return { ok: false, fallbackUrl: remoteUrl, reason: `下载失败 HTTP ${res.status}` };
    }
    const len = Number(res.headers.get("content-length") ?? "0");
    if (len > MAX_DOWNLOAD_BYTES) {
      return { ok: false, fallbackUrl: remoteUrl, reason: "图片过大" };
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_DOWNLOAD_BYTES) {
      return { ok: false, fallbackUrl: remoteUrl, reason: "图片过大" };
    }

    const ct = res.headers.get("content-type") ?? "image/png";
    const { ext, mime } = extFromContentType(ct);
    const storagePath = `${userId}/${jobId}.${ext}`;

    const { error: uploadError } = await admin.storage.from(bucket).upload(storagePath, buf, {
      contentType: mime,
      upsert: true,
    });

    if (uploadError) {
      return { ok: false, fallbackUrl: remoteUrl, reason: uploadError.message };
    }

    const { data: signed, error: signError } = await admin.storage
      .from(bucket)
      .createSignedUrl(storagePath, STORAGE_IMAGE_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      return {
        ok: false,
        fallbackUrl: remoteUrl,
        reason: signError?.message ?? "无法生成签名链接",
      };
    }

    return { ok: true, storagePath, displayUrl: signed.signedUrl };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return { ok: false, fallbackUrl: remoteUrl, reason: msg };
  }
}

/** 为已入库的 storage_path 签发新的 48h 签名 URL（仅服务端） */
export async function createSignedUrlForStoragePath(
  admin: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const bucket = getGenerationBucket();
  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(storagePath, STORAGE_IMAGE_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
