import { NextResponse, type NextRequest } from "next/server";
import { safeInternalPath } from "@/lib/safe-redirect-path";
import {
  adminSessionConfigured,
  adminSessionCookieOptions,
  createAdminSessionValue,
  verifyAdminCredentials,
  ADMIN_SESSION_COOKIE,
} from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "");
  const password = String(form.get("password") ?? "");
  const nextRaw = String(form.get("next") ?? "");

  const next = safeInternalPath(nextRaw, "/admin");
  const redirectTo = next.startsWith("/admin") ? next : "/admin";

  const cfg = adminSessionConfigured();
  if (!cfg.ok) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", redirectTo);
    url.searchParams.set("error", `后台未配置：${cfg.missing.join(", ")}`);
    return NextResponse.redirect(url, { status: 302 });
  }

  if (!verifyAdminCredentials(username, password)) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("next", redirectTo);
    url.searchParams.set("error", "账号或密码错误");
    return NextResponse.redirect(url, { status: 302 });
  }

  const sessionValue = createAdminSessionValue(username, 60 * 60 * 12);
  const res = NextResponse.redirect(new URL(redirectTo, request.url), { status: 302 });
  res.cookies.set(ADMIN_SESSION_COOKIE, sessionValue, adminSessionCookieOptions(60 * 60 * 12));
  return res;
}

