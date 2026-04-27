import Link from "next/link";
import { LoginForm } from "@/app/login/LoginForm";
import { safeInternalPath } from "@/lib/safe-redirect-path";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const raw = safeInternalPath(sp.next, "/admin");
  const redirectAfterLogin = raw.startsWith("/admin") ? raw : "/admin";

  return (
    <div className="min-h-screen bg-[#080706] text-zinc-100">
      <header className="border-b border-zinc-800/90 bg-[#0c0b0a] px-4 py-3">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF9D3C] text-xs font-bold text-[#0F0E0C]">
              A
            </span>
            <span className="text-sm font-semibold text-white">管理后台登录</span>
          </div>
          <Link href="/login" className="text-xs text-zinc-400 transition hover:text-[#FF9D3C]">
            普通用户登录 →
          </Link>
        </div>
      </header>
      <LoginForm variant="admin" redirectAfterLogin={redirectAfterLogin} />
    </div>
  );
}
