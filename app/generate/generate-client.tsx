"use client";

import { useState } from "react";
import { submitGenerateImage } from "@/app/generate/actions";

export type GenerateModelOption = {
  id: string;
  label: string;
  description: string;
};

type Props = {
  initialBalance: number;
  models: GenerateModelOption[];
  /** 内测：不扣次，按钮不因余额为 0 禁用 */
  testingMode?: boolean;
};

const field =
  "resize-y rounded-xl border border-zinc-700 bg-[#121110] px-3 py-2 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#FF9D3C]/60 focus:ring-1 focus:ring-[#FF9D3C]/40";

export function GenerateClient({ initialBalance, models, testingMode = false }: Props) {
  const defaultModelId = models[0]?.id ?? "";
  const [modelId, setModelId] = useState(defaultModelId);
  const [prompt, setPrompt] = useState("");
  const [testNote, setTestNote] = useState("");
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
        <p className="rounded-xl border border-[#FF9D3C]/30 bg-[#FF9D3C]/10 px-4 py-3 text-sm text-[#FF9D3C]">
          当前没有启用的模型，请在 <code className="font-mono text-white/90">lib/models.ts</code> 中打开对应模型的{" "}
          <code className="font-mono text-white/90">enabled</code>。
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 text-zinc-100">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">创作</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {testingMode ? (
              <>
                内测阶段 <span className="font-medium text-[#FF9D3C]">不扣次数</span>
                ，任务与图片仍会记入账户。
              </>
            ) : (
              <>
                每次成功扣 <span className="font-medium text-[#FF9D3C]">1 次</span> 余额，失败不扣。
              </>
            )}
          </p>
        </div>
        {testingMode ? (
          <div className="rounded-xl border border-[#FF9D3C]/35 bg-[#FF9D3C]/10 px-4 py-2 text-sm font-medium text-[#FF9D3C]">
            内测 · 不限次数
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-[#161412] px-4 py-2 text-sm text-zinc-300">
            剩余次数：<span className="font-semibold tabular-nums text-white">{balance}</span>
          </div>
        )}
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-zinc-200">选择模型</h2>
        <p className="mt-1 text-xs text-zinc-500">
          模型 id 可在 <code className="rounded bg-zinc-800 px-1 font-mono text-zinc-300">lib/models.ts</code> 替换。
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {models.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer flex-col rounded-xl border p-3 transition sm:p-4 ${
                modelId === m.id
                  ? "border-[#FF9D3C] bg-[#FF9D3C]/10 ring-1 ring-[#FF9D3C]/40"
                  : "border-zinc-800 bg-[#161412] hover:border-zinc-600"
              }`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  name="imageModel"
                  value={m.id}
                  checked={modelId === m.id}
                  onChange={() => setModelId(m.id)}
                  className="mt-1 accent-[#FF9D3C]"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-white">{m.label}</span>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-400">{m.description}</p>
                  <p className="mt-2 font-mono text-[10px] text-zinc-500">{m.id}</p>
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <form onSubmit={handleGenerate} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-zinc-300">提示词</span>
          <textarea
            required
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你想要的画面，例如：极简风电商主图，白底，一盏台灯…"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          <span className="text-zinc-300">本轮测试备注（可选）</span>
          <textarea
            rows={2}
            value={testNote}
            onChange={(e) => setTestNote(e.target.value)}
            placeholder="例如：测人物手指、测中文长文案…"
            className={field}
          />
        </label>
        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={loading || (!testingMode && balance < 1) || !modelId}
          className="rounded-full bg-[#FF9D3C] py-3 text-sm font-semibold text-[#0F0E0C] transition hover:bg-[#ffb05a] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "生成中，请稍候（可能需几十秒）…"
            : !testingMode && balance < 1
              ? "次数不足，请联系运营充值"
              : "生成"}
        </button>
      </form>

      {jobId ? (
        <p className="mt-4 text-xs text-zinc-500">
          任务 ID：<span className="font-mono text-zinc-300">{jobId}</span>
        </p>
      ) : null}

      {imageUrl ? (
        <div className="mt-10">
          <h2 className="text-sm font-medium text-zinc-200">结果</h2>
          <p className="mt-1 text-xs text-zinc-500">
            已存 Supabase 的链接为签名地址，约 48 小时内有效；过期后在「记录」页重新打开可刷新。
          </p>
          <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800 bg-[#121110]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="生成结果" className="mx-auto max-h-[70vh] w-full object-contain" />
          </div>
        </div>
      ) : null}

      <p className="mt-10 text-xs leading-relaxed text-zinc-600">
        请勿生成违法、侵权或低俗内容。生成结果仅供参考，商用请自行确认版权与合规。
      </p>
    </div>
  );
}
