import { isGenerationTestingMode } from "@/lib/generation-testing-mode";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 与 `GENERATION_TESTING_MODE=1` 同时启用时：允许未登录请求以「池用户」身份生成（仍写 image_jobs、不调登录态）。
 * 环境变量 `ANONYMOUS_GENERATE_AS_USER_ID` 须为 Supabase 里已注册且存在 `profiles` 行的用户 UUID。
 * 正式上线务必关闭测试模式并删除该变量。
 */
export function getAnonymousGeneratePoolUserId(): string | null {
  if (!isGenerationTestingMode()) return null;
  const id = process.env.ANONYMOUS_GENERATE_AS_USER_ID?.trim();
  if (!id || !UUID_RE.test(id)) return null;
  return id;
}

export function isAnonymousGenerateEnabled(): boolean {
  return getAnonymousGeneratePoolUserId() != null;
}
