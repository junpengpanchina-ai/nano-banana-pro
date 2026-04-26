import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICE_PER_IMAGE_CNY, MAX_PROMPT_LENGTH } from "@/lib/constants";
import { promptFailsSensitiveCheck } from "@/lib/sensitive";
import { requestUpstreamImage } from "@/lib/upstream/image-generation";

export type GenerateImageResult =
  | { ok: true; jobId: string; imageUrl: string; balanceImages: number; priceCny: number }
  | { ok: false; error: string; jobId?: string };

/**
 * Server-only: auth、扣次、上游出图。上游地址与密钥仅从环境变量读取。
 */
export async function runGenerateImageJob(promptRaw: string): Promise<GenerateImageResult> {
  const prompt = promptRaw.trim();
  if (!prompt) {
    return { ok: false, error: "请输入提示词" };
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: `提示词最长 ${MAX_PROMPT_LENGTH} 字` };
  }

  const sensitive = promptFailsSensitiveCheck(prompt);
  if (sensitive) {
    return { ok: false, error: sensitive };
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
  const model = process.env.UPSTREAM_MODEL?.trim();
  if (!model) {
    return { ok: false, error: "服务未配置绘图模型" };
  }

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
      model,
      status: "pending",
      price_cny: PRICE_PER_IMAGE_CNY,
    })
    .select("id")
    .single();

  if (insertError || !job) {
    return { ok: false, error: insertError?.message ?? "创建任务失败" };
  }

  const jobId = job.id as string;

  const upstream = await requestUpstreamImage(prompt);

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

  const { error: successUpdateError } = await admin
    .from("image_jobs")
    .update({
      status: "succeeded",
      image_url: upstream.imageUrl,
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
    imageUrl: upstream.imageUrl,
    balanceImages: newBalance,
    priceCny: PRICE_PER_IMAGE_CNY,
  };
}
