import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { safeInternalPath } from "@/lib/safe-redirect-path";

/**
 * 邮箱验证 / OAuth / PKCE 回调：用 `code` 换会话并写入 Cookie，再重定向到站内路径。
 */
export async function GET(request: NextRequest) {
  const urlEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!urlEnv || !anonEnv) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextPath = safeInternalPath(searchParams.get("next"), "/generate");
  const destination = new URL(nextPath, origin).toString();

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin).toString());
  }

  let response = NextResponse.redirect(destination);

  const supabase = createServerClient(urlEnv, anonEnv, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        response = NextResponse.redirect(destination);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const u = new URL("/login", origin);
    u.searchParams.set("error", "auth_callback");
    u.searchParams.set("message", error.message);
    return NextResponse.redirect(u.toString());
  }

  return response;
}
