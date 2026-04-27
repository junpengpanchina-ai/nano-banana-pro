"use client";

import { useActionState } from "react";
import { adminDeleteUserForm, type AdminFormState } from "@/app/admin/actions";

function message(state: AdminFormState): string | null {
  if (!state) return null;
  if (state.ok) return state.message ?? "已完成。";
  return state.error;
}

export function AdminDeleteUserForm() {
  const [state, formAction, pending] = useActionState(adminDeleteUserForm, null);

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-2xl border border-red-900/40 bg-[#1a1010] p-5">
      <p className="text-sm text-red-200/90">
        将<strong>永久</strong>从 Auth 删除用户（级联删除 <span className="font-mono">profiles</span>、任务与相关数据）。不可删除当前登录的管理员。
      </p>
      <div>
        <label htmlFor="delete-target" className="text-sm text-zinc-400">
          用户 UUID 或邮箱
        </label>
        <input
          id="delete-target"
          name="target"
          required
          autoComplete="off"
          placeholder="uuid 或 user@example.com"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0F0E0C] px-3 py-2 font-mono text-sm text-white outline-none focus:border-red-400/60"
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
        className="rounded-full border border-red-500/50 bg-red-950/60 px-5 py-2 text-sm font-semibold text-red-100 transition hover:bg-red-900/50 disabled:opacity-50"
      >
        {pending ? "删除中…" : "确认删除"}
      </button>
    </form>
  );
}
