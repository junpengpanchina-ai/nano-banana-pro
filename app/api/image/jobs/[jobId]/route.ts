import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnonymousGeneratePoolUserId } from "@/lib/anonymous-generate-mode";
import { normalizeLocale } from "@/lib/i18n/locale";
import { pickModerationDict } from "@/lib/i18n/moderation";

export const dynamic = "force-dynamic";

/**
 * 任务状态查询（轮询兜底）：用于在 SSE 被代理缓冲/断开时继续推进 UI。
 * 仅允许本人任务（或免登录池用户）查询。
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> },
) {
  const { jobId } = await context.params;
  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const firstLang = acceptLanguage.split(",")[0]?.trim() ?? "";
  const dict = pickModerationDict(normalizeLocale(firstLang));

  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json({ ok: false, error: dict.badRequest }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const poolId = getAnonymousGeneratePoolUserId();

  if (!user && !poolId) {
    return NextResponse.json({ ok: false, error: dict.unauthorized }, { status: 401 });
  }

  const { data: job, error } = await supabase
    .from("image_jobs")
    .select("id,user_id,status,image_url,error_message,price_cny,created_at")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !job) {
    return NextResponse.json({ ok: false, error: dict.notFound }, { status: 404 });
  }

  const ownerId = job.user_id as string;
  if (user) {
    if (ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: dict.forbidden }, { status: 403 });
    }
  } else if (!poolId || ownerId !== poolId) {
    return NextResponse.json({ ok: false, error: dict.forbidden }, { status: 403 });
  }

  if (job.status === "succeeded") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance_images")
      .eq("id", ownerId)
      .maybeSingle();
    return NextResponse.json({
      ok: true,
      status: "succeeded",
      imageUrl: job.image_url,
      balanceImages: profile?.balance_images ?? 0,
      priceCny: Number(job.price_cny ?? 0),
    });
  }

  if (job.status === "failed") {
    return NextResponse.json({
      ok: true,
      status: "failed",
      error: job.error_message || dict.serverErrorTryLater,
    });
  }

  return NextResponse.json({ ok: true, status: "pending" });
}

