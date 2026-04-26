import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          图片生成小工具
        </Link>
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            href="/generate"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            生成
          </Link>
          <Link
            href="/dashboard"
            className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            记录
          </Link>
          {user ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              登录
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
