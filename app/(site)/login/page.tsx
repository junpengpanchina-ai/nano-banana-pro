import { LoginForm } from "@/app/login/LoginForm";
import { safeInternalPath } from "@/lib/safe-redirect-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const redirectAfterLogin = safeInternalPath(sp.next, "/generate");
  let callbackError: string | null = null;
  if (sp.error === "missing_code") {
    callbackError = "验证链接无效或已过期，请重新尝试登录或注册。";
  } else if (sp.error === "auth_callback" && sp.message) {
    callbackError = sp.message;
  }
  return <LoginForm callbackError={callbackError} redirectAfterLogin={redirectAfterLogin} />;
}
