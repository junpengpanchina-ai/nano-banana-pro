import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { allowedImageSizesFor, getEnabledImageModels, getImageModel, IMAGE_MODELS } from "@/lib/models";
import { validatePromptInput } from "@/lib/prompt/validate";
import { requestUpstreamImage } from "@/lib/upstream/image-generation";
import { persistJobImageToStorage } from "@/lib/storage/persist-job-image";
import { isGenerationTestingMode } from "@/lib/generation-testing-mode";
import { parseAspectRatio, parseImageSize } from "@/lib/generation-draw-params";
import { sanitizeReferenceImageUrls } from "@/lib/storage/validate-reference-url";
import { getAnonymousGeneratePoolUserId } from "@/lib/anonymous-generate-mode";
import {
  appendPostgrestTroubleshootHint,
  isCreditsChargedColumnMissing,
} from "@/lib/postgrest-error-hint";
import { normalizeLocale } from "@/lib/i18n/locale";
import { pickModerationDict } from "@/lib/i18n/moderation";

const MAX_TEST_NOTE = 2000;

export type GenerateImageResult =
  | { ok: true; jobId: string; imageUrl: string; balanceImages: number; priceCny: number }
  | { ok: false; error: string; jobId?: string };

export type PrepareImageJobFailReason =
  | "unauthorized"
  | "insufficient_credits"
  | "model_unavailable"
  | "no_models"
  | "validation_failed"
  | "db_error";

export type PrepareImageJobResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string; reason: PrepareImageJobFailReason };

/**
 * Server-only: auth、（可选）扣次、上游出图、写入 Storage 并记 48h 签名链（失败则回落上游 URL）。
 */
export type RunGenerateDrawInput = {
  aspectRatio?: string | null;
  imageSize?: string | null;
  referenceImageUrls?: string[] | null;
  locale?: string | null;
};

function priceCnyForModelId(modelId: string): number {
  const m = IMAGE_MODELS.find((x) => x.id === modelId);
  return m ? Number(m.priceCny) : 0;
}

/**
 * 校验用户、余额、写 pending 任务（含锁定 credit_cost 与参考图 URL），不调用上游。
 * 供「异步队列」与同步 `runGenerateImageJob` 共用。
 */
export async function prepareImageGenerationJob(
  promptRaw: string,
  modelIdRaw: string,
  testNoteRaw?: string | null,
  drawInput?: RunGenerateDrawInput,
): Promise<PrepareImageJobResult> {
  const locale = drawInput?.locale ?? null;
  const dict = pickModerationDict(normalizeLocale(locale));
  if (getEnabledImageModels().length === 0) {
    return { ok: false, error: dict.noModelsEnabled, reason: "no_models" };
  }

  const modelId = modelIdRaw.trim();
  const selected = getImageModel(modelId);
  if (!selected) {
    return { ok: false, error: dict.modelUnavailable, reason: "model_unavailable" };
  }

  let testNote: string | null = null;
  if (testNoteRaw != null && String(testNoteRaw).trim()) {
    testNote = String(testNoteRaw).trim().slice(0, MAX_TEST_NOTE);
  }

  const aspectRatio = parseAspectRatio(drawInput?.aspectRatio);
  const imageSize = parseImageSize(drawInput?.imageSize, allowedImageSizesFor(selected));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const poolUserId = getAnonymousGeneratePoolUserId();
  const actingUserId = user?.id ?? poolUserId ?? null;
  if (!actingUserId) {
    return { ok: false, error: dict.unauthorized, reason: "unauthorized" };
  }

  const refUrls = sanitizeReferenceImageUrls(drawInput?.referenceImageUrls ?? [], actingUserId, 10);

  const validated = validatePromptInput(promptRaw, {
    minLength: refUrls.length > 0 ? 5 : 1,
    locale: drawInput?.locale ?? null,
  });
  if (!validated.ok) {
    return { ok: false, error: validated.error, reason: "validation_failed" };
  }
  const prompt = validated.prompt;

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("balance_images")
    .eq("id", actingUserId)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false,
      error: appendPostgrestTroubleshootHint(
        `用户资料读取失败：${profileError.message}`,
        profileError,
      ),
      reason: "db_error",
    };
  }
  if (!profile) {
    return {
      ok: false,
      error: poolUserId && !user
        ? "免登录测试：请在 Supabase 注册测试账号并将 UUID 填入 ANONYMOUS_GENERATE_AS_USER_ID（须已有 profiles 行）"
        : "用户资料不存在",
      reason: "db_error",
    };
  }

  const testing = isGenerationTestingMode();
  const creditCost = selected.creditsPerGeneration;
  if (!testing && profile.balance_images < creditCost) {
    return {
      ok: false,
      error: dict.insufficientCredits(creditCost, profile.balance_images),
      reason: "insufficient_credits",
    };
  }

  const { data: job, error: insertError } = await admin
    .from("image_jobs")
    .insert({
      user_id: actingUserId,
      prompt,
      model: selected.id,
      model_label: selected.label,
      price_cny: selected.priceCny,
      test_note: testNote,
      aspect_ratio: aspectRatio,
      image_size: imageSize,
      status: "pending",
      credit_cost: creditCost,
      reference_signed_urls: refUrls.length > 0 ? refUrls : null,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    const base = insertError?.message
      ? `创建任务失败：${insertError.message}`
      : "创建任务失败";
    return {
      ok: false,
      error: appendPostgrestTroubleshootHint(base, insertError ?? null),
      reason: "db_error",
    };
  }

  return { ok: true, jobId: job.id as string };
}

/**
 * 在请求结束后由 `after()` 调用：拉 pending 任务、调上游、写库、成功则扣积分。
 * 用户断开页面不影响此函数执行完毕。
 */
export async function completeImageGenerationJob(jobId: string): Promise<void> {
  const admin = createAdminClient();

  try {
    const { data: row, error: loadError } = await admin.from("image_jobs").select("*").eq("id", jobId).maybeSingle();
    if (loadError || !row) return;
    if (row.status !== "pending") return;

    const actingUserId = row.user_id as string;
    const prompt = row.prompt as string;
    const modelId = row.model as string;
    const aspectRatio = typeof row.aspect_ratio === "string" && row.aspect_ratio ? row.aspect_ratio : "auto";
    const imageSize = typeof row.image_size === "string" && row.image_size ? row.image_size : "1K";

    const selected = getImageModel(modelId);
    if (!selected) {
      await admin
        .from("image_jobs")
        .update({ status: "failed", error_message: "模型不可用或已禁用" })
        .eq("id", jobId)
        .eq("status", "pending");
      return;
    }

    const creditCost =
      typeof row.credit_cost === "number" && row.credit_cost >= 0
        ? row.credit_cost
        : selected.creditsPerGeneration;

    const testing = isGenerationTestingMode();
    const { data: profile, error: profileReadError } = await admin
      .from("profiles")
      .select("balance_images")
      .eq("id", actingUserId)
      .maybeSingle();

    if (profileReadError || !profile) {
      await admin
        .from("image_jobs")
        .update({ status: "failed", error_message: "用户资料不存在，已取消生成" })
        .eq("id", jobId)
        .eq("status", "pending");
      return;
    }

    if (!testing && profile.balance_images < creditCost) {
      await admin
        .from("image_jobs")
        .update({
          status: "failed",
          error_message: `积分不足（本模型需 ${creditCost} 积分，当前 ${profile.balance_images}）`,
        })
        .eq("id", jobId)
        .eq("status", "pending");
      return;
    }

    const rawRefs = row.reference_signed_urls as unknown;
    const refFromDb = Array.isArray(rawRefs) ? rawRefs.filter((x): x is string => typeof x === "string") : [];
    const refUrlsSafe = sanitizeReferenceImageUrls(refFromDb, actingUserId, 10);

    const upstream = await requestUpstreamImage(prompt, modelId, {
      aspectRatio,
      imageSize,
      referenceUrls: refUrlsSafe,
    });

    if (!upstream.ok) {
      await admin
        .from("image_jobs")
        .update({
          status: "failed",
          error_message: upstream.error,
          upstream_request_id: upstream.upstreamRequestId ?? null,
        })
        .eq("id", jobId)
        .eq("status", "pending");
      return;
    }

    const persisted = await persistJobImageToStorage(admin, actingUserId, jobId, upstream.imageUrl);
    const finalUrl = persisted.ok ? persisted.displayUrl : persisted.fallbackUrl;

    const { error: successUpdateError } = await admin
      .from("image_jobs")
      .update({
        status: "succeeded",
        image_url: finalUrl,
        storage_path: persisted.ok ? persisted.storagePath : null,
        upstream_request_id: upstream.upstreamRequestId ?? null,
        credits_charged: creditCost,
      })
      .eq("id", jobId)
      .eq("status", "pending");

    let finalUpdateError = successUpdateError;
    if (isCreditsChargedColumnMissing(successUpdateError)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[completeImageGenerationJob] image_jobs.credits_charged 缺失，已用不含该列的 UPDATE。请执行 migration：20260429100000_image_jobs_credits_charged.sql",
        );
      }
      const { error: retryWithoutCreditsError } = await admin
        .from("image_jobs")
        .update({
          status: "succeeded",
          image_url: finalUrl,
          storage_path: persisted.ok ? persisted.storagePath : null,
          upstream_request_id: upstream.upstreamRequestId ?? null,
        })
        .eq("id", jobId)
        .eq("status", "pending");
      finalUpdateError = retryWithoutCreditsError;
    }

    if (finalUpdateError) {
      await admin
        .from("image_jobs")
        .update({
          status: "failed",
          error_message: appendPostgrestTroubleshootHint(
            "图片已生成但保存记录失败，请联系管理员。",
            finalUpdateError,
          ),
        })
        .eq("id", jobId)
        .eq("status", "pending");
      return;
    }

    if (testing) return;

    const newBalance = profile.balance_images - creditCost;
    const { error: balanceError } = await admin
      .from("profiles")
      .update({ balance_images: newBalance })
      .eq("id", actingUserId);

    if (balanceError) {
      // 与同步路径一致：任务已成功落库，仅扣积分失败；不反刷为 failed，避免用户已拿到图却显示失败
      console.error("[completeImageGenerationJob] 扣积分失败", balanceError);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "服务端异常";
    await admin
      .from("image_jobs")
      .update({ status: "failed", error_message: message })
      .eq("id", jobId)
      .eq("status", "pending");
  }
}

/**
 * 同步路径：prepare → complete → 组装返回（供 Server Action 与 POST /api/image/generate）。
 */
export async function buildGenerateImageResultFromJob(
  jobId: string,
  locale?: string | null,
): Promise<GenerateImageResult> {
  const dict = pickModerationDict(normalizeLocale(locale ?? null));
  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("image_jobs")
    .select("status, image_url, error_message, model, user_id")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: dict.jobNotReadable };
  }

  if (row.status === "pending") {
    return { ok: false, error: dict.jobStillProcessing, jobId };
  }

  if (row.status === "failed") {
    return { ok: false, error: (row.error_message as string) || "生成失败", jobId };
  }

  const uid = row.user_id as string;
  const { data: profile } = await admin.from("profiles").select("balance_images").eq("id", uid).maybeSingle();
  const modelId = row.model as string;
  const priceCny = priceCnyForModelId(modelId);

  return {
    ok: true,
    jobId,
    imageUrl: row.image_url as string,
    balanceImages: profile?.balance_images ?? 0,
    priceCny,
  };
}

export async function runGenerateImageJob(
  promptRaw: string,
  modelIdRaw: string,
  testNoteRaw?: string | null,
  drawInput?: RunGenerateDrawInput,
): Promise<GenerateImageResult> {
  const prep = await prepareImageGenerationJob(promptRaw, modelIdRaw, testNoteRaw, drawInput);
  if (!prep.ok) return prep;

  await completeImageGenerationJob(prep.jobId);
  return buildGenerateImageResultFromJob(prep.jobId, drawInput?.locale ?? null);
}
