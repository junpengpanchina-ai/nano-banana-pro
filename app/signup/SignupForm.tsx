"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const input =
  "rounded-xl border border-zinc-700 bg-[#121110] px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#FF9D3C]/60 focus:ring-1 focus:ring-[#FF9D3C]/40";

type Props = {
  generationTestingMode: boolean;
  /** 注册成功并拿到 session 后跳转的路径 */
  redirectAfterSignup?: string;
};

type SignupPhase = "form" | "success_session" | "success_confirm_email";

export function SignupForm({
  generationTestingMode,
  redirectAfterSignup = "/generate",
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SignupPhase>("form");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || undefined },
      },
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    if (data.session) {
      setPhase("success_session");
      router.refresh();
      window.setTimeout(() => {
        router.push(redirectAfterSignup);
      }, 900);
      return;
    }
    if (data.user) {
      setPhase("success_confirm_email");
      return;
    }
    setError("注册未返回用户信息，请稍后重试或联系管理员。");
  }

  if (phase === "success_session") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-zinc-100">
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[#FF9D3C]/40 bg-[#FF9D3C]/10 px-6 py-8 text-center"
        >
          <p className="text-xl font-semibold text-white">注册成功</p>
          <p className="mt-3 text-sm text-zinc-300">已为你登录，正在进入创作页…</p>
          <p className="mt-6 text-xs text-zinc-500">若页面未自动跳转，请点击下方按钮。</p>
          <Link
            href={redirectAfterSignup}
            className="mt-4 inline-flex rounded-full bg-[#FF9D3C] px-6 py-2.5 text-sm font-semibold text-[#0F0E0C] transition hover:bg-[#ffb05a]"
          >
            进入创作
          </Link>
        </div>
      </main>
    );
  }

  if (phase === "success_confirm_email") {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-zinc-100">
        <div
          role="status"
          aria-live="polite"
          className="rounded-2xl border border-[#FF9D3C]/40 bg-[#FF9D3C]/10 px-6 py-8 text-center"
        >
          <p className="text-xl font-semibold text-white">注册成功</p>
          <p className="mt-3 text-sm text-zinc-300">
            账号已创建。当前项目开启了<strong className="text-[#FF9D3C]"> 邮箱验证 </strong>
            ，请打开邮箱{" "}
            <span className="font-mono text-zinc-200">{email}</span> 中的链接完成验证，然后再登录。
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(redirectAfterSignup)}`}
            className="mt-6 inline-flex rounded-full bg-[#FF9D3C] px-6 py-2.5 text-sm font-semibold text-[#0F0E0C] transition hover:bg-[#ffb05a]"
          >
            去登录
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-zinc-100">
      <h1 className="text-2xl font-semibold text-white">注册</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {generationTestingMode
          ? "注册后账号与生成记录写入 Supabase；当前为内测，生成不扣次数。"
          : "注册后默认 0 次，需运营者在后台人工加次数。"}
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-300">昵称（可选）</span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-300">邮箱</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-300">密码</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={input}
          />
        </label>
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-full bg-[#FF9D3C] py-2.5 text-sm font-semibold text-[#0F0E0C] transition hover:bg-[#ffb05a] disabled:opacity-60"
        >
          {loading ? "提交中…" : "注册"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        已有账号？{" "}
        <Link
          href={`/login?next=${encodeURIComponent(redirectAfterSignup)}`}
          className="font-medium text-[#FF9D3C] underline-offset-2 hover:underline"
        >
          登录
        </Link>
      </p>
    </main>
  );
}
