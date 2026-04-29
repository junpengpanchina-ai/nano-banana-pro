/**
 * 将 Supabase PostgREST / Postgres 常见错误转成可操作的排障提示（不含密钥）。
 */

export type PostgrestLikeError = {
  code?: string;
  message?: string;
  hint?: string;
  details?: string;
} | null;

const CREDITS_MIGRATION =
  "supabase/migrations/20260429100000_image_jobs_credits_charged.sql";

export function isCreditsChargedColumnMissing(error: PostgrestLikeError): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  return (error.message ?? "").includes("credits_charged");
}

function truncateForDisplay(s: string, max = 220): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/**
 * 在已有中文说明后追加排障句；未知错误不附加原始 SQL，避免对终端用户噪音过大。
 */
export function appendPostgrestTroubleshootHint(
  userMessage: string,
  error: PostgrestLikeError,
): string {
  if (!error?.message && !error?.code) return userMessage;

  if (isCreditsChargedColumnMissing(error)) {
    return `${userMessage}（排障：表 image_jobs 缺少列 credits_charged 或未执行迁移。请在 Supabase SQL Editor 执行仓库内 ${CREDITS_MIGRATION}。）`;
  }

  if (error.code === "42703") {
    return `${userMessage}（排障：数据库提示未定义列（42703），请对照仓库 supabase/migrations/ 补齐尚未执行的迁移。）`;
  }

  if (error.code === "42P01") {
    return `${userMessage}（排障：表不存在（42P01），请确认已执行 init 等迁移。）`;
  }

  const raw = error.message?.trim();
  if (raw && raw.length > 0) {
    return `${userMessage}（详情：${truncateForDisplay(raw)}）`;
  }

  return userMessage;
}
