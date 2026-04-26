import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <p className="text-sm font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
        AI 图片生成工具
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
        网页提交需求，按张出图
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
        适合朋友圈配图、电商素材、头像、海报灵感、短视频封面草图。多模型可选、按模型单价记账（如{" "}
        <span className="font-semibold text-zinc-800 dark:text-zinc-200">0.6～0.8 元/张</span>
        ），每次成功仍扣 1 次余额；先充值后使用；后台记录每次生成与结果。
      </p>
      <ul className="mt-8 list-inside list-disc space-y-2 text-zinc-600 dark:text-zinc-400">
        <li>邮箱注册登录</li>
        <li>多模型对比 + 提示词生成</li>
        <li>成功扣 1 次，失败不扣</li>
        <li>充值与对账由运营人工处理（不接 Stripe）</li>
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        {user ? (
          <>
            <Link
              href="/generate"
              className="inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-400"
            >
              去生成
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              我的记录
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/signup"
              className="inline-flex rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-400"
            >
              注册
            </Link>
            <Link
              href="/login"
              className="inline-flex rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              登录
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
