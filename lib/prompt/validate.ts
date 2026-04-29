import { MAX_PROMPT_LENGTH } from "@/lib/constants";
import { findSensitiveKeywordHit } from "@/lib/sensitive";
import { normalizeLocale } from "@/lib/i18n/locale";
import { pickModerationDict } from "@/lib/i18n/moderation";

export type PromptValidation =
  | { ok: true; prompt: string }
  | { ok: false; error: string };

export type ValidatePromptOptions = {
  /** 默认 1：非空即可。图生图等场景可设为 5 */
  minLength?: number;
  /** 用于多语言错误提示（默认 zh-CN）。示例：navigator.language / Accept-Language 的首选项 */
  locale?: string | null;
};

/** 提示词端口与生成流程共用，保证规则一致 */
export function validatePromptInput(raw: unknown, opts?: ValidatePromptOptions): PromptValidation {
  const minLength = opts?.minLength != null && opts.minLength > 0 ? opts.minLength : 1;
  const dict = pickModerationDict(normalizeLocale(opts?.locale ?? null));
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) {
    return { ok: false, error: dict.emptyPrompt };
  }
  if (s.length < minLength) {
    return { ok: false, error: dict.promptTooShort(minLength) };
  }
  if (s.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: dict.promptTooLong(MAX_PROMPT_LENGTH) };
  }
  const hit = findSensitiveKeywordHit(s);
  if (hit) {
    return { ok: false, error: dict.blockedKeyword(hit) };
  }
  return { ok: true, prompt: s };
}
