import Link from "next/link";
import { safeInternalPath } from "@/lib/safe-redirect-path";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const raw = safeInternalPath(sp.next, "/admin");
  const redirectAfterLogin = raw.startsWith("/admin") ? raw : "/admin";
  const error = sp.error ? String(sp.error) : null;

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
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-8">
        {error ? (
          <div className="rounded-xl border border-rose-500/25 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <form
          action="/admin/auth/login"
          method="post"
          className="space-y-4 rounded-2xl border border-zinc-800 bg-[#161412] p-5"
        >
          <input type="hidden" name="next" value={redirectAfterLogin} />

          <div>
            <label className="block text-sm font-medium text-zinc-200">账号</label>
            <input
              name="username"
              defaultValue="admin"
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#0F0E0C] px-3 py-2 text-sm text-zinc-100 outline-none ring-[#FF9D3C]/40 focus:border-[#FF9D3C]/35 focus:ring-2"
              placeholder="admin"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-200">密码</label>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-zinc-800 bg-[#0F0E0C] px-3 py-2 text-sm text-zinc-100 outline-none ring-[#FF9D3C]/40 focus:border-[#FF9D3C]/35 focus:ring-2"
              placeholder="请输入密码"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-[#FF9D3C] px-4 py-2.5 text-sm font-semibold text-[#0F0E0C] transition hover:bg-[#ffb05a]"
          >
            登录管理后台
          </button>
        </form>

        <p className="text-xs text-zinc-500">
          提示：管理后台登录不使用 Supabase Auth。普通用户请走{" "}
          <Link href="/login" className="font-medium text-zinc-300 hover:text-white">
            /login
          </Link>
          。
        </p>
      </main>
    </div>
  );
}
