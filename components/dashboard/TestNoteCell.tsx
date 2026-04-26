"use client";

import { useState, useTransition } from "react";
import { updateImageJobTestNote } from "@/app/dashboard/actions";

type Props = {
  jobId: string;
  initialNote: string | null;
};

export function TestNoteCell({ jobId, initialNote }: Props) {
  const [value, setValue] = useState(initialNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateImageJobTestNote(jobId, value);
      if (!res.ok) {
        setError(res.error);
        return;
      }
    });
  }

  return (
    <div className="min-w-[140px] max-w-[220px] space-y-1">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={2}
        placeholder="测后反馈…"
        className="w-full resize-y rounded-lg border border-zinc-700 bg-[#121110] px-2 py-1 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#FF9D3C]/50"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-md border border-zinc-600 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
        >
          {pending ? "…" : "保存"}
        </button>
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </div>
  );
}
