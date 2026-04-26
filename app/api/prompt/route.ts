import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validatePromptInput } from "@/lib/prompt/validate";

/**
 * 提示词端口：仅校验长度与敏感词，不写库、不扣次、不调上游。
 * 需登录 Cookie（与站点同源）。
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    typeof body === "object" && body !== null && "prompt" in body
      ? (body as { prompt: unknown }).prompt
      : undefined;

  const v = validatePromptInput(raw);
  if (!v.ok) {
    return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, prompt: v.prompt });
}
