import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getEnabledImageModels, getImageModel } from "@/lib/models";
import { validatePromptInput } from "@/lib/prompt/validate";
import { requestUpstreamImage } from "@/lib/upstream/image-generation";
import { persistJobImageToStorage } from "@/lib/storage/persist-job-image";

const MAX_TEST_NOTE = 2000;

export type GenerateImageResult =
  | { ok: true; jobId: string; imageUrl: string; balanceImages: number; priceCny: number }
  | { ok: false; error: string; jobId?: string };

/**
 * Server-only: auth、扣次、上游出图、写入 Storage 并记 48h 签名链（失败则回落上游 URL）。
 */
export async function runGenerateImageJob(
  promptRaw: string,
  modelIdRaw: string,
  testNoteRaw?: string | null,
): Promise<GenerateImageResult> {
  if (getEnabledImageModels().length === 0) {
    return { ok: false, error: "暂无可用模型，请联系管理员。" };
  }

  const validated = validatePromptInput(promptRaw);
  if (!validated.ok) {
    return { ok: false, error: validated.error };
  }
  const prompt = validated.prompt;

  const modelId = modelIdRaw.trim();
  const selected = getImageModel(modelId);
  if (!selected) {
    return { ok: false, error: "模型不可用或未启用" };
  }

  let testNote: string | null = null;
  if (testNoteRaw != null && String(testNoteRaw).trim()) {
    testNote = String(testNoteRaw).trim().slice(0, MAX_TEST_NOTE);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, error: "请先登录" };
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("balance_images")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, error: "用户资料不存在" };
  }

  if (profile.balance_images < 1) {
    return { ok: false, error: "次数不足，请联系运营充值" };
  }

  const { data: job, error: insertError } = await admin
    .from("image_jobs")
    .insert({
      user_id: user.id,
      prompt,
      model: selected.id,
      model_label: selected.label,
      price_cny: selected.priceCny,
      test_note: testNote,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !job) {
    return { ok: false, error: insertError?.message ?? "创建任务失败" };
  }

  const jobId = job.id as string;

  const upstream = await requestUpstreamImage(prompt, selected.id);

  if (!upstream.ok) {
    await admin
      .from("image_jobs")
      .update({
        status: "failed",
        error_message: upstream.error,
        upstream_request_id: upstream.upstreamRequestId ?? null,
      })
      .eq("id", jobId);

    return { ok: false, error: upstream.error, jobId };
  }

  const persisted = await persistJobImageToStorage(admin, user.id, jobId, upstream.imageUrl);

  const finalUrl = persisted.ok ? persisted.displayUrl : persisted.fallbackUrl;

  const { error: successUpdateError } = await admin
    .from("image_jobs")
    .update({
      status: "succeeded",
      image_url: finalUrl,
      storage_path: persisted.ok ? persisted.storagePath : null,
      upstream_request_id: upstream.upstreamRequestId ?? null,
    })
    .eq("id", jobId);

  if (successUpdateError) {
    return { ok: false, error: "图片已生成但保存记录失败，请联系管理员。", jobId };
  }

  const newBalance = profile.balance_images - 1;
  const { error: balanceError } = await admin
    .from("profiles")
    .update({ balance_images: newBalance })
    .eq("id", user.id);

  if (balanceError) {
    return {
      ok: false,
      error: "图片已保存但扣次失败，请联系管理员。",
      jobId,
    };
  }

  return {
    ok: true,
    jobId,
    imageUrl: finalUrl,
    balanceImages: newBalance,
    priceCny: selected.priceCny,
  };
}
