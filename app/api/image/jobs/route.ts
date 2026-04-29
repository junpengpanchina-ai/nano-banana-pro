import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnonymousGeneratePoolUserId } from "@/lib/anonymous-generate-mode";
import { completeImageGenerationJob, prepareImageGenerationJob } from "@/lib/run-generate-image";
import { normalizeLocale } from "@/lib/i18n/locale";
import { pickModerationDict } from "@/lib/i18n/moderation";

export const maxDuration = 60;

/**
 * 创建异步生图任务：立即返回 `jobId`（202），实际出图在 `after()` 中继续执行；
 * 客户端用 GET `/api/image/jobs/[jobId]/events`（SSE）订阅状态。用户关闭页面不影响后台完成。
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const acceptLanguage = request.headers.get("accept-language") ?? "";
  const firstLang = acceptLanguage.split(",")[0]?.trim() ?? "";
  const dict = pickModerationDict(normalizeLocale(firstLang));

  if (!user && !getAnonymousGeneratePoolUserId()) {
    return NextResponse.json({ ok: false, error: dict.unauthorized }, { status: 401 });
  }

  let body: {
    prompt?: unknown;
    modelId?: unknown;
    testNote?: unknown;
    aspectRatio?: unknown;
    imageSize?: unknown;
    referenceImageUrls?: unknown;
    locale?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: dict.invalidJson }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const modelId = typeof body.modelId === "string" ? body.modelId : "";
  const testNote =
    body.testNote === null || body.testNote === undefined
      ? null
      : typeof body.testNote === "string"
        ? body.testNote
        : null;
  const aspectRatio = typeof body.aspectRatio === "string" ? body.aspectRatio : null;
  const imageSize = typeof body.imageSize === "string" ? body.imageSize : null;
  const referenceImageUrls = Array.isArray(body.referenceImageUrls)
    ? body.referenceImageUrls.filter((x): x is string => typeof x === "string")
    : undefined;
  const locale = typeof body.locale === "string" ? body.locale : null;

  const prep = await prepareImageGenerationJob(prompt, modelId, testNote, {
    aspectRatio,
    imageSize,
    referenceImageUrls,
    locale,
  });

  if (!prep.ok) {
    const err = prep.error;
    let status = 400;
    if (err === dict.unauthorized) status = 401;
    // locale-specific insufficient credits: detect via 402 fallback when it contains a number pattern is unreliable;
    // so keep a conservative heuristic.
    else if (err.toLowerCase().includes("credit") || err.includes("积分") || err.includes("積分")) status = 402;
    else if (err.includes("管理员")) status = 500;
    return NextResponse.json({ ok: false, error: err }, { status });
  }

  after(() =>
    completeImageGenerationJob(prep.jobId).catch((e) => {
      console.error("[api/image/jobs] completeImageGenerationJob", prep.jobId, e);
    }),
  );

  return NextResponse.json({ ok: true, jobId: prep.jobId }, { status: 202 });
}
