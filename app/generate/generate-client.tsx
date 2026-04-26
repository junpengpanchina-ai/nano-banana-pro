"use client";

import { useMemo, useState } from "react";
import { submitGenerateImage } from "@/app/generate/actions";

export type GenerateModelOption = {
  id: string;
  label: string;
  description: string;
  priceCny: number;
};

type Props = {
  initialBalance: number;
  models: GenerateModelOption[];
};

export function GenerateClient({ initialBalance, models }: Props) {
  const defaultModelId = models[0]?.id ?? "";
  const [modelId, setModelId] = useState(defaultModelId);
  const [prompt, setPrompt] = useState("");
  const [testNote, setTestNote] = useState("");
  const [balance, setBalance] = useState(initialBalance);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selected = useMemo(() => models.find((m) => m.id === modelId), [models, modelId]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setImageUrl(null);
    setJobId(null);
    setLoading(true);
    try {
      const data = await submitGenerateImage(prompt.trim(), modelId, testNote.trim() || null);
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

  if (models.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          当前没有启用的模型，请在代码中打开 <code className="font-mono">lib/models.ts</code> 里对应模型的{" "}
          <code className="font-mono">enabled</code>。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">生成图片</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            按所选模型单价记账；每次成功仍扣{" "}
            <span className="font-medium text-zinc-800 dark:text-zinc-200">1 次</span> 余额；失败不扣。
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          剩余次数：<span className="font-semibold tabular-nums">{balance}</span>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">选择模型</h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
          先多模型对比效果，再决定主推；模型 id 以你上游实际为准，可在 <code className="font-mono">lib/models.ts</code>{" "}
          替换。
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {models.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer flex-col rounded-xl border p-3 transition sm:p-4 ${
                modelId === m.id
                  ? "border-amber-500 bg-amber-50 ring-1 ring-amber-400 dark:border-amber-500 dark:bg-amber-950/30 dark:ring-amber-600"
                  : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:border-zinc-600"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  name="imageModel"
                  value={m.id}
                  checked={modelId === m.id}
                  onChange={() => setModelId(m.id)}
                  className="mt-1"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">{m.label}</span>
                    <span className="shrink-0 text-sm tabular-nums text-amber-800 dark:text-amber-200">
                      ¥{m.priceCny.toFixed(2)}/张
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{m.description}</p>
                  <p className="mt-2 font-mono text-[10px] text-zinc-400 dark:text-zinc-500">{m.id}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

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
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">本轮测试备注（可选）</span>
          <textarea
            rows={2}
            value={testNote}
            onChange={(e) => setTestNote(e.target.value)}
            placeholder="例如：测人物手指、测中文长文案、测电商主图…"
            className="resize-y rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
          />
        </label>
        {selected ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            当前将按 <span className="font-medium text-zinc-700 dark:text-zinc-300">{selected.label}</span>{" "}
            记账 ¥{selected.priceCny.toFixed(2)}（服务端校验，与页面展示一致）。
          </p>
        ) : null}
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading || balance < 1 || !modelId}
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
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
            已保存到 Supabase 的图片链接为签名地址，约 48 小时内有效；过期后可在「记录」页重新打开以刷新链接。
          </p>
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
