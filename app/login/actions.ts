"use server";

/**
 * 登录框可输入「admin」作为快捷账号：映射到环境变量中的真实邮箱（须在 Supabase Auth 注册且密码一致）。
 * 配置 `ADMIN_LOGIN_EMAIL=you@domain.com`，并在 `ADMIN_EMAILS` 中包含同一邮箱以访问 /admin。
 */
export async function resolveLoginEmail(identifier: string): Promise<string> {
  const t = identifier.trim();
  if (!t) return t;
  if (t.toLowerCase() === "admin") {
    const mapped = process.env.ADMIN_LOGIN_EMAIL?.trim() ?? "";
    if (mapped.includes("@")) return mapped;
  }
  return t;
}
