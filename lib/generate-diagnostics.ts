import type { SupabaseClient } from "@supabase/supabase-js";
import { isGenerationTestingMode } from "@/lib/generation-testing-mode";
import { getAnonymousGeneratePoolUserId } from "@/lib/anonymous-generate-mode";
import { isCreditsChargedColumnMissing } from "@/lib/postgrest-error-hint";

export type GenerateEnvDiagnosticRow = {
  key: string;
  value: string;
  ok: boolean;
};

/**
 * 服务端可读：上游与内测相关环境（不含密钥与完整 URL）。
 */
export function getGenerateEnvDiagnostics(): GenerateEnvDiagnosticRow[] {
  const drawFull = process.env.UPSTREAM_DRAW_URL?.trim();
  const resultFull = process.env.UPSTREAM_RESULT_URL?.trim();
  const base = process.env.UPSTREAM_BASE_URL?.trim();
  const drawPath = process.env.UPSTREAM_DRAW_PATH?.trim();
  const resultPath = process.env.UPSTREAM_RESULT_PATH?.trim();
  const urlsOk =
    Boolean(drawFull && resultFull) || Boolean(base && drawPath && resultPath);
  const keyOk = Boolean(process.env.UPSTREAM_API_KEY?.trim());

  const testing = isGenerationTestingMode();
  const pool = Boolean(getAnonymousGeneratePoolUserId());

  return [
    {
      key: "上游绘图 URL（DRAW + RESULT 或 BASE+PATH）",
      value: urlsOk ? "已配置" : "未配置（生图将报「请在部署环境配置…」类错误）",
      ok: urlsOk,
    },
    {
      key: "UPSTREAM_API_KEY",
      value: keyOk ? "已配置" : "未配置",
      ok: keyOk,
    },
    {
      key: "GENERATION_TESTING_MODE（内测不扣积分）",
      value: testing ? "开启" : "关闭",
      ok: true,
    },
    {
      key: "ANONYMOUS_GENERATE_AS_USER_ID（免登录池用户）",
      value: pool ? "已设置 UUID" : "未设置",
      ok: true,
    },
  ];
}

export type ImageJobsColumnProbe =
  | { ok: true; creditsChargedPresent: true; note: string }
  | { ok: true; creditsChargedPresent: false; note: string }
  | { ok: false; note: string };

/**
 * 探测 image_jobs 是否包含 credits_charged（需 service_role 客户端）。
 */
export async function probeImageJobsCreditsChargedColumn(
  admin: SupabaseClient,
): Promise<ImageJobsColumnProbe> {
  const { error } = await admin.from("image_jobs").select("credits_charged").limit(1);
  if (!error) {
    return { ok: true, creditsChargedPresent: true, note: "可查询列 credits_charged" };
  }
  if (isCreditsChargedColumnMissing(error)) {
    return {
      ok: true,
      creditsChargedPresent: false,
      note: error.message ?? "列不存在",
    };
  }
  return {
    ok: false,
    note: error.message ?? "探测失败（表权限、网络或表不存在等）",
  };
}
