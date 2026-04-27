"use client";

import { useActionState } from "react";
import { adminCreateUserForm, type AdminFormState } from "@/app/admin/actions";

function message(state: AdminFormState): string | null {
  if (!state) return null;
  if (state.ok) return state.message ?? "已完成。";
  return state.error;
}

export function AdminCreateUserForm() {
  const [state, formAction, pending] = useActionState(adminCreateUserForm, null);

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-2xl border border-zinc-800 bg-[#161412] p-5">
      <p className="text-sm text-zinc-500">
        在 Supabase Auth 中创建账号；注册触发器会自动插入 <span className="font-mono text-zinc-400">profiles</span>，初始积分为 0。
      </p>
      <div>
        <label htmlFor="create-email" className="text-sm text-zinc-400">
          登录邮箱
        </label>
        <input
          id="create-email"
          name="email"
          type="email"
          required
          autoComplete="off"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0F0E0C] px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D3C]"
        />
      </div>
      <div>
        <label htmlFor="create-password" className="text-sm text-zinc-400">
          初始密码（至少 6 位）
        </label>
        <input
          id="create-password"
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="mt-1 w-full max-w-md rounded-lg border border-zinc-700 bg-[#0F0E0C] px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D3C]"
        />
      </div>
      {message(state) ? (
        <p
          className={`text-sm ${state?.ok === false ? "text-red-400" : "text-emerald-400"}`}
          role={state?.ok === false ? "alert" : "status"}
        >
          {message(state)}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-zinc-200 px-5 py-2 text-sm font-semibold text-[#0F0E0C] transition hover:bg-white disabled:opacity-50"
      >
        {pending ? "创建中…" : "创建账号"}
      </button>
    </form>
  );
}
