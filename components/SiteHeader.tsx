import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import { isAnonymousGenerateEnabled } from "@/lib/anonymous-generate-mode";
import { isGenerationTestingMode } from "@/lib/generation-testing-mode";
import { isAdminEmail } from "@/lib/admin-auth";

export async function SiteHeader() {
  const testingMode = isGenerationTestingMode();
  const anonymousGenerate = isAnonymousGenerateEnabled();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let balance: number | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("balance_images").eq("id", user.id).single();
    balance = profile?.balance_images ?? null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-[#0F0E0C]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF9D3C] text-sm text-[#0F0E0C]">
            N
          </span>
          <span>
            Nana Image Lab<span className="font-normal text-zinc-500"> · 内测</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2 text-sm sm:gap-4">
          <Link href="/generate" className="text-zinc-400 transition hover:text-white">
            创作
          </Link>
          <Link href="/dashboard" className="text-zinc-400 transition hover:text-white">
            记录
          </Link>
          {user?.email && isAdminEmail(user.email) ? (
            <Link href="/admin" className="text-zinc-400 transition hover:text-[#FF9D3C]">
              管理
            </Link>
          ) : null}
          {anonymousGenerate && !user ? (
            <span className="rounded-full border border-amber-500/45 bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-200">
              免登录测试
            </span>
          ) : user && testingMode ? (
            <span className="rounded-full border border-[#FF9D3C]/40 bg-[#FF9D3C]/10 px-3 py-1 text-xs font-semibold text-[#FF9D3C]">
              内测 · 不限
            </span>
          ) : user && balance !== null ? (
            <span className="rounded-full border border-[#FF9D3C]/40 bg-[#FF9D3C]/10 px-3 py-1 text-xs font-semibold tabular-nums text-[#FF9D3C]">
              {balance} 积分
            </span>
          ) : null}
          {user ? (
            <LogoutButton />
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/login"
                className="hidden text-xs text-zinc-500 transition hover:text-zinc-300 sm:inline"
                title="运维登录管理控制台"
              >
                管理入口
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-[#FF9D3C] px-4 py-1.5 text-sm font-semibold text-[#0F0E0C] transition hover:bg-[#ffb05a]"
              >
                登录
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
