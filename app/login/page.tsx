import { LoginForm } from "@/app/login/LoginForm";
import { safeInternalPath } from "@/lib/safe-redirect-path";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const redirectAfterLogin = safeInternalPath(sp.next, "/generate");
  return <LoginForm redirectAfterLogin={redirectAfterLogin} />;
}
