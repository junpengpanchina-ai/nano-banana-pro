"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const input =
  "rounded-xl border border-zinc-700 bg-[#121110] px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#FF9D3C]/60 focus:ring-1 focus:ring-[#FF9D3C]/40";

type Props = {
  redirectAfterLogin: string;
};

export function LoginForm({ redirectAfterLogin }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.refresh();
    router.push(redirectAfterLogin);
  }

  const signupHref =
    redirectAfterLogin === "/generate"
      ? "/signup"
      : `/signup?next=${encodeURIComponent(redirectAfterLogin)}`;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-zinc-100">
      <h1 className="text-2xl font-semibold text-white">登录</h1>
      <p className="mt-2 text-sm text-zinc-400">使用注册邮箱与密码登录。</p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
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
            autoComplete="current-password"
            required
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
          {loading ? "登录中…" : "登录"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500">
        还没有账号？{" "}
        <Link href={signupHref} className="font-medium text-[#FF9D3C] underline-offset-2 hover:underline">
          注册
        </Link>
      </p>
    </main>
  );
}
