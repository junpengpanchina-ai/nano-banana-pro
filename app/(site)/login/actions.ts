"use server";

export type ResolveLoginResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

export type LoginResolveContext = "site" | "admin";

/**
 * 解析登录框输入：完整邮箱；`admin` 快捷账号**仅**在 context === `admin`（/admin/login）时可用。
 */
export async function resolveLoginIdentifier(
  identifier: string,
  context: LoginResolveContext = "site",
): Promise<ResolveLoginResult> {
  const t = identifier.trim();
  if (!t) {
    return { ok: false, error: "请输入邮箱或 admin" };
  }
  if (t.toLowerCase() === "admin") {
    if (context === "site") {
      return {
        ok: false,
        error:
          "用户站不支持 admin 快捷登录。请使用注册邮箱登录，或打开专用页面：/admin/login",
      };
    }
    const mapped = process.env.ADMIN_LOGIN_EMAIL?.trim() ?? "";
    if (!mapped.includes("@")) {
      return {
        ok: false,
        error:
          "未配置 ADMIN_LOGIN_EMAIL，无法使用 admin 登录。请在部署环境（如 Vercel）设置该变量为已在 Supabase Auth 注册的真实邮箱；或不要输入 admin，直接使用完整邮箱登录。",
      };
    }
    return { ok: true, email: mapped.trim().toLowerCase() };
  }
  if (!t.includes("@")) {
    return {
      ok: false,
      error: "请输入包含 @ 的邮箱，或使用 admin（需已配置 ADMIN_LOGIN_EMAIL）。",
    };
  }
  return { ok: true, email: t.toLowerCase() };
}
