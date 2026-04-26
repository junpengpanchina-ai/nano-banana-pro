"use client";

import { useState } from "react";
import { submitGenerateImage } from "@/app/generate/actions";

type Props = {
  initialBalance: number;
};

export function GenerateClient({ initialBalance }: Props) {
  const [prompt, setPrompt] = useState("");
  const [balance, setBalance] = useState(initialBalance);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setImageUrl(null);
    setJobId(null);
    setLoading(true);
    try {
      const data = await submitGenerateImage(prompt.trim());
      if (!data.ok) {
        setError(data.error);
        if (data.jobId) setJobId(data.jobId);
        return;
      }
      setImageUrl(data.imageUrl);
      setJobId(data.jobId);
      setBalance(data.balanceImages);
    } catch {
      setError("执行失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">生成图片</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            每张成功生成按 <span className="font-medium text-zinc-800 dark:text-zinc-200">0.6 元</span>{" "}
            计价并扣 1 次余额；失败不扣次数。
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          剩余次数：<span className="font-semibold tabular-nums">{balance}</span>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">提示词</span>
          <textarea
            required
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的画面，例如：极简风电商主图，白底，一盏台灯…"
            className="resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || balance < 1}
          className="rounded-xl bg-amber-500 py-3 text-sm font-semibold text-amber-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "生成中，请稍候（可能需几十秒）…" : balance < 1 ? "次数不足，请联系运营充值" : "生成"}
        </button>
      </form>

      {jobId ? (
        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
          任务 ID：<span className="font-mono">{jobId}</span>
        </p>
      ) : null}

      {imageUrl ? (
        <div className="mt-10">
          <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">结果</h2>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="生成结果" className="mx-auto max-h-[70vh] w-full object-contain" />
          </div>
        </div>
      ) : null}

      <p className="mt-10 text-xs leading-relaxed text-zinc-500 dark:text-zinc-500">
        请勿生成违法、侵权或低俗内容。生成结果仅供参考，商用请自行确认版权与合规。
      </p>
    </div>
  );
}
