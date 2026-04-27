"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runGenerateImageJob, type GenerateImageResult } from "@/lib/run-generate-image";
import { getAnonymousGeneratePoolUserId } from "@/lib/anonymous-generate-mode";
import { uploadUserReferenceImage } from "@/lib/storage/upload-user-reference";

export async function submitGenerateImage(
  prompt: string,
  modelId: string,
  testNote?: string | null,
  aspectRatio?: string | null,
  imageSize?: string | null,
  referenceImageUrls?: string[] | null,
): Promise<GenerateImageResult> {
  return runGenerateImageJob(prompt, modelId, testNote, {
    aspectRatio,
    imageSize,
    referenceImageUrls: referenceImageUrls ?? undefined,
  });
}

export type SubmitReferenceImageResult =
  | { ok: true; signedUrl: string }
  | { ok: false; error: string };

/** 单张参考图：写入 Storage 并返回短时签名 URL，供图生图请求使用 */
export async function submitReferenceImage(formData: FormData): Promise<SubmitReferenceImageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const poolUserId = getAnonymousGeneratePoolUserId();
  const uploadAsUserId = user?.id ?? poolUserId ?? null;
  if (!uploadAsUserId) {
    return { ok: false, error: "请先登录" };
  }

  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return { ok: false, error: "请选择图片文件" };
  }

  const blob = file as File;
  if (blob.size === 0) {
    return { ok: false, error: "文件为空" };
  }

  const buf = await blob.arrayBuffer();
  let mime = blob.type?.trim() || "";
  if (!mime.startsWith("image/")) {
    const n = blob.name?.toLowerCase() ?? "";
    if (n.endsWith(".png")) mime = "image/png";
    else if (n.endsWith(".webp")) mime = "image/webp";
    else mime = "image/jpeg";
  }

  const admin = createAdminClient();
  const up = await uploadUserReferenceImage(admin, uploadAsUserId, buf, mime);
  if (!up.ok) {
    return { ok: false, error: up.error };
  }
  return { ok: true, signedUrl: up.signedUrl };
}
