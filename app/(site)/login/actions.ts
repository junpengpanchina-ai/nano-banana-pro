"use server";

export type ResolveLoginResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * 解析登录框输入：仅支持完整邮箱。
 * 管理后台登录走 `/admin/login`（独立账号密码），不走 Supabase。
 */
export async function resolveLoginIdentifier(identifier: string): Promise<ResolveLoginResult> {
  const t = identifier.trim();
  if (!t) {
    return { ok: false, error: "请输入邮箱" };
  }
  if (t.toLowerCase() === "admin") {
    return { ok: false, error: "普通用户请使用注册邮箱登录；管理员请打开 /admin/login" };
  }
  if (!t.includes("@")) {
    return {
      ok: false,
      error: "请输入包含 @ 的邮箱。",
    };
  }
  return { ok: true, email: t.toLowerCase() };
}
