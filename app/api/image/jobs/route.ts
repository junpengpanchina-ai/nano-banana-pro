import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAnonymousGeneratePoolUserId } from "@/lib/anonymous-generate-mode";
import { completeImageGenerationJob, prepareImageGenerationJob } from "@/lib/run-generate-image";

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

  if (!user && !getAnonymousGeneratePoolUserId()) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    prompt?: unknown;
    modelId?: unknown;
    testNote?: unknown;
    aspectRatio?: unknown;
    imageSize?: unknown;
    referenceImageUrls?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
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

  const prep = await prepareImageGenerationJob(prompt, modelId, testNote, {
    aspectRatio,
    imageSize,
    referenceImageUrls,
  });

  if (!prep.ok) {
    const err = prep.error;
    let status = 400;
    if (err.includes("请先登录")) status = 401;
    else if (err.includes("次数不足") || err.includes("积分不足")) status = 402;
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
