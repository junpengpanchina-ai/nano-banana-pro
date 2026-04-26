import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runGenerateImageJob } from "@/lib/run-generate-image";

export const maxDuration = 120;

/**
 * 生图端口：与 Server Action 相同逻辑（写 image_jobs、扣次、Storage 48h 签名链）。
 * 需登录 Cookie。供脚本 / 外部客户端与网页同源调用。
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { prompt?: unknown; modelId?: unknown; testNote?: unknown };
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

  const result = await runGenerateImageJob(prompt, modelId, testNote);

  if (!result.ok) {
    const err = result.error;
    let status = 400;
    if (err.includes("请先登录")) status = 401;
    else if (err.includes("次数不足")) status = 402;
    else if (err.includes("管理员")) status = 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
