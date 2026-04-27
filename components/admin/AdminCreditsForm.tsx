"use client";

import { useActionState } from "react";
import { adminAdjustBalanceForm, type AdminFormState } from "@/app/admin/actions";

function message(state: AdminFormState): string | null {
  if (!state) return null;
  if (state.ok) return state.message ?? "已更新积分并写入审计。";
  return state.error;
}

export function AdminCreditsForm() {
  const [state, formAction, pending] = useActionState(adminAdjustBalanceForm, null);

  return (
    <form action={formAction} className="mt-4 space-y-4 rounded-2xl border border-zinc-800 bg-[#161412] p-5">
      <div>
        <label htmlFor="admin-user-id" className="text-sm text-zinc-400">
          用户 UUID（与 Auth 用户 id 相同）
        </label>
        <input
          id="admin-user-id"
          name="userId"
          required
          autoComplete="off"
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0F0E0C] px-3 py-2 font-mono text-sm text-white outline-none focus:border-[#FF9D3C]"
        />
      </div>
      <div>
        <label htmlFor="admin-delta" className="text-sm text-zinc-400">
          变更积分（正数加、负数减）
        </label>
        <input
          id="admin-delta"
          name="delta"
          type="number"
          required
          className="mt-1 w-full max-w-xs rounded-lg border border-zinc-700 bg-[#0F0E0C] px-3 py-2 tabular-nums text-white outline-none focus:border-[#FF9D3C]"
        />
      </div>
      <div>
        <label htmlFor="admin-note" className="text-sm text-zinc-400">
          备注（可选）
        </label>
        <textarea
          id="admin-note"
          name="note"
          rows={2}
          maxLength={500}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-[#0F0E0C] px-3 py-2 text-sm text-white outline-none focus:border-[#FF9D3C]"
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
        className="rounded-full bg-[#FF9D3C] px-5 py-2 text-sm font-semibold text-[#0F0E0C] transition hover:bg-[#ffb05a] disabled:opacity-50"
      >
        {pending ? "提交中…" : "提交调整"}
      </button>
    </form>
  );
}
