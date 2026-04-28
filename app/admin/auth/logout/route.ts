import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, adminSessionCookieOptions } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const res = NextResponse.redirect(new URL("/admin/login", request.url), { status: 302 });
  // delete() 在部分前缀/选项下可能不稳定，显式 set 过期更稳
  res.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions(60),
    maxAge: 0,
  });
  return res;
}

