"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { resolveLoginIdentifier } from "@/app/login/actions";

const input =
  "rounded-xl border border-zinc-700 bg-[#121110] px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#FF9D3C]/60 focus:ring-1 focus:ring-[#FF9D3C]/40";

type Props = {
  redirectAfterLogin: string;
  /** 从 /auth/callback 重定向带回的错误说明 */
  callbackError?: string | null;
  /** `admin`：管理后台专用登录（与用户站分离） */
  variant?: "site" | "admin";
};

export function LoginForm({ redirectAfterLogin, callbackError = null, variant = "site" }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(callbackError ?? null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resolved = await resolveLoginIdentifier(email, variant === "admin" ? "admin" : "site");
      if (!resolved.ok) {
        setError(resolved.error);
        return;
      }
      const supabase = createClient();
      const { data, error: signError } = await supabase.auth.signInWithPassword({
        email: resolved.email,
        password,
      });
      if (signError) {
        const raw = signError.message;
        setError(
          raw === "Invalid login credentials"
            ? "邮箱或密码不正确。若使用 admin：请确认已配置 ADMIN_LOGIN_EMAIL、该邮箱在 Supabase Auth 中已注册且密码一致；进管理后台还需把同一邮箱写入 ADMIN_EMAILS。"
            : raw,
        );
        return;
      }
      if (!data.session) {
        setError("未拿到登录会话：若项目开启了邮箱验证，请先点击邮件里的链接再登录。");
        return;
      }
      window.location.assign(redirectAfterLogin);
    } catch (err) {
      setError(err instanceof Error ? err.message : "网络异常，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  const signupHref =
    redirectAfterLogin === "/generate"
      ? "/signup"
      : `/signup?next=${encodeURIComponent(redirectAfterLogin)}`;

  const isAdminEntry = variant === "admin";

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center px-4 py-16 text-zinc-100">
      <h1 className="text-2xl font-semibold text-white">{isAdminEntry ? "管理员登录" : "登录"}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {isAdminEntry ? (
          <>
            与<strong className="text-zinc-300">用户站</strong>{" "}
            <Link href="/login" className="font-medium text-[#FF9D3C] underline-offset-2 hover:underline">
              /login
            </Link>{" "}
            分离：此处用于运维进入控制台。若已配置{" "}
            <code className="rounded bg-zinc-800 px-1 font-mono text-xs">ADMIN_LOGIN_EMAIL</code>
            ，可输入 <code className="rounded bg-zinc-800 px-1 font-mono text-xs">admin</code> 作为快捷账号。
          </>
        ) : (
          <>
            使用<strong className="text-zinc-300">注册邮箱</strong>与密码登录（不要在此输入 admin）。管理员请使用{" "}
            <Link href="/admin/login" className="font-medium text-[#FF9D3C] underline-offset-2 hover:underline">
              /admin/login
            </Link>
            。
          </>
        )}
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-300">{isAdminEntry ? "邮箱或 admin" : "注册邮箱"}</span>
          <input
            type="text"
            autoComplete="username"
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
          {loading ? "登录中…" : isAdminEntry ? "进入控制台" : "登录"}
        </button>
      </form>
      {isAdminEntry ? (
        <p className="mt-6 text-center text-sm text-zinc-500">
          需要<strong className="text-zinc-400">用户端</strong>账号？{" "}
          <Link href="/login" className="font-medium text-[#FF9D3C] underline-offset-2 hover:underline">
            用户登录
          </Link>
          {" · "}
          <Link href="/signup" className="font-medium text-zinc-400 underline-offset-2 hover:text-zinc-200 hover:underline">
            注册
          </Link>
        </p>
      ) : (
        <p className="mt-6 text-center text-sm text-zinc-500">
          还没有账号？{" "}
          <Link href={signupHref} className="font-medium text-[#FF9D3C] underline-offset-2 hover:underline">
            注册
          </Link>
        </p>
      )}
    </main>
  );
}
