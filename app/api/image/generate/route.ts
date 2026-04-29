import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnonymousGeneratePoolUserId } from "@/lib/anonymous-generate-mode";
import { runGenerateImageJob } from "@/lib/run-generate-image";
import { normalizeLocale } from "@/lib/i18n/locale";
import { pickModerationDict } from "@/lib/i18n/moderation";

export const maxDuration = 120;

/**
 * 生图端口：与 Server Action 相同逻辑（写 image_jobs、可选扣次、Storage 48h 签名链）。
 * 默认需登录 Cookie；若开启内测免登录（`GENERATION_TESTING_MODE` + `ANONYMOUS_GENERATE_AS_USER_ID`）可无 Cookie 调用（慎用，易被刷量）。
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

  const result = await runGenerateImageJob(prompt, modelId, testNote, {
    aspectRatio,
    imageSize,
    referenceImageUrls,
    locale,
  });

  if (!result.ok) {
    const err = result.error;
    let status = 400;
    if (err === dict.unauthorized) status = 401;
    else if (err.toLowerCase().includes("credit") || err.includes("积分") || err.includes("積分")) status = 402;
    else if (err.includes("管理员")) status = 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
