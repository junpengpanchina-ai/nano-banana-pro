import { MAX_PROMPT_LENGTH } from "@/lib/constants";
import { promptFailsSensitiveCheck } from "@/lib/sensitive";

export type PromptValidation =
  | { ok: true; prompt: string }
  | { ok: false; error: string };

export type ValidatePromptOptions = {
  /** 默认 1：非空即可。图生图等场景可设为 5 */
  minLength?: number;
};

/** 提示词端口与生成流程共用，保证规则一致 */
export function validatePromptInput(raw: unknown, opts?: ValidatePromptOptions): PromptValidation {
  const minLength = opts?.minLength != null && opts.minLength > 0 ? opts.minLength : 1;
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) {
    return { ok: false, error: "请输入提示词" };
  }
  if (s.length < minLength) {
    return { ok: false, error: `提示词至少 ${minLength} 个字` };
  }
  if (s.length > MAX_PROMPT_LENGTH) {
    return { ok: false, error: `提示词最长 ${MAX_PROMPT_LENGTH} 字` };
  }
  const sensitive = promptFailsSensitiveCheck(s);
  if (sensitive) {
    return { ok: false, error: sensitive };
  }
  return { ok: true, prompt: s };
}
