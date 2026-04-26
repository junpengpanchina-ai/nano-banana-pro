"use client";

import Link from "next/link";
import { useState } from "react";
import { submitGenerateImage } from "@/app/generate/actions";
import { MAX_PROMPT_LENGTH } from "@/lib/constants";
import { ASPECT_RATIO_OPTIONS, IMAGE_SIZE_OPTIONS } from "@/lib/generation-draw-params";

export type GenerateModelOption = {
  id: string;
  label: string;
  description: string;
};

type Props = {
  /** 未登录也可浏览页面；仅登录后可提交生成 */
  isLoggedIn: boolean;
  initialBalance: number;
  models: GenerateModelOption[];
  /** 内测：不扣次，按钮不因余额为 0 禁用 */
  testingMode?: boolean;
};

/** 未登录时右侧展示的示意缩略图（非用户生成结果） */
const DEMO_PREVIEW_SRC =
  "https://picsum.photos/seed/nano-banana-generate-demo/800/800.webp";

const input =
  "w-full rounded-xl border border-zinc-700 bg-[#121110] px-3 py-2.5 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#FF9D3C]/60 focus:ring-1 focus:ring-[#FF9D3C]/40";
const selectClass = `${input} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`;
const labelCls = "text-sm font-medium text-zinc-300";

export function GenerateClient({ isLoggedIn, initialBalance, models, testingMode = false }: Props) {
  const defaultModelId = models[0]?.id ?? "";
  const [modelId, setModelId] = useState(defaultModelId);
  const [imageSize, setImageSize] = useState<(typeof IMAGE_SIZE_OPTIONS)[number]>("1K");
  const [aspectRatio, setAspectRatio] = useState<(typeof ASPECT_RATIO_OPTIONS)[number]>("auto");
  const [prompt, setPrompt] = useState("");
  const [testNote, setTestNote] = useState("");
  const [balance, setBalance] = useState(initialBalance);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!isLoggedIn) return;
    setError(null);
    setImageUrl(null);
    setJobId(null);
    setLoading(true);
    try {
      const data = await submitGenerateImage(
        prompt.trim(),
        modelId,
        testNote.trim() || null,
        aspectRatio,
        imageSize,
      );
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
      <div className="min-h-[50vh] bg-[#0F0E0C] px-4 py-12">
        <p className="mx-auto max-w-2xl rounded-xl border border-[#FF9D3C]/30 bg-[#FF9D3C]/10 px-4 py-3 text-sm text-[#FF9D3C]">
          当前没有启用的模型，请在 <code className="font-mono text-white/90">lib/models.ts</code> 中打开对应模型的{" "}
          <code className="font-mono text-white/90">enabled</code>。
        </p>
      </div>
    );
  }

  const canSubmit =
    isLoggedIn && !loading && !!modelId && (testingMode || balance >= 1);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0F0E0C] text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
        {!isLoggedIn ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-[#161412] px-4 py-3 text-sm text-zinc-300">
            <span>
              当前为<strong className="text-[#FF9D3C]"> 浏览模式 </strong>
              ：可查看布局与示例预览；生成图片请先
              <Link href="/login?next=/generate" className="mx-1 font-semibold text-[#FF9D3C] underline-offset-2 hover:underline">
                登录
              </Link>
              或
              <Link href="/signup" className="mx-1 font-semibold text-[#FF9D3C] underline-offset-2 hover:underline">
                注册
              </Link>
              。
            </span>
          </div>
        ) : null}

        <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
              Nano Banana <span className="font-semibold text-[#FF9D3C]">AI</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              左侧配置模型、画质与宽高比；右侧实时预览生成结果。布局参考产品站双栏工作台。
            </p>
          </div>
          {!isLoggedIn ? (
            <div className="rounded-full border border-zinc-600 bg-zinc-900 px-4 py-2 text-sm text-zinc-400">未登录</div>
          ) : testingMode ? (
            <div className="rounded-full border border-[#FF9D3C]/35 bg-[#FF9D3C]/10 px-4 py-2 text-sm font-semibold text-[#FF9D3C]">
              内测 · 不限次数
            </div>
          ) : (
            <div className="rounded-full border border-zinc-700 bg-[#161412] px-4 py-2 text-sm text-zinc-300">
              剩余次数：<span className="font-semibold tabular-nums text-white">{balance}</span>
            </div>
          )}
        </header>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
          {/* 左栏：控制区（图二、图三能力） */}
          <div className="order-2 flex flex-col gap-6 rounded-2xl border border-zinc-800/90 bg-[#141210] p-6 shadow-2xl lg:order-1">
            <div className="flex rounded-full bg-zinc-900/90 p-1 ring-1 ring-zinc-800">
              <span className="flex-1 rounded-full bg-[#FF9D3C] py-2.5 text-center text-sm font-semibold text-[#0F0E0C]">
                文生图
              </span>
              <span
                className="flex-1 cursor-not-allowed py-2.5 text-center text-sm text-zinc-500"
                title="即将开放"
              >
                图生图
              </span>
            </div>

            <form className="flex flex-col gap-5" onSubmit={handleGenerate}>
              <label className="flex flex-col gap-2">
                <span className={labelCls}>模型</span>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className={selectClass}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  }}
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs leading-relaxed text-zinc-500">
                  {models.find((m) => m.id === modelId)?.description}
                </p>
              </label>

              <label className="flex flex-col gap-2">
                <span className={labelCls}>画质（Image Size）</span>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value as (typeof IMAGE_SIZE_OPTIONS)[number])}
                  className={selectClass}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  }}
                >
                  {IMAGE_SIZE_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className={labelCls}>宽高比（Aspect Ratio）</span>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as (typeof ASPECT_RATIO_OPTIONS)[number])}
                  className={selectClass}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a1a1aa'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  }}
                >
                  {ASPECT_RATIO_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={labelCls}>提示词</span>
                  <span className="text-xs tabular-nums text-zinc-500">
                    {prompt.length}/{MAX_PROMPT_LENGTH}
                  </span>
                </div>
                <textarea
                  required
                  rows={6}
                  maxLength={MAX_PROMPT_LENGTH}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述画面，例如：极简电商主图、白底、一盏台灯…"
                  className={`${input} min-h-[140px] resize-y`}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className={labelCls}>测试备注（可选）</span>
                <textarea
                  rows={2}
                  value={testNote}
                  onChange={(e) => setTestNote(e.target.value)}
                  placeholder="本轮测试点，例如：手指、中文排版…"
                  className={`${input} resize-y`}
                />
              </label>

              {error ? (
                <p className="rounded-xl border border-red-500/35 bg-red-950/35 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              {isLoggedIn ? (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-1 w-full rounded-full bg-[#FF9D3C] py-3.5 text-sm font-bold text-[#0F0E0C] shadow-lg shadow-[#FF9D3C]/15 transition hover:bg-[#ffb05a] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loading
                    ? "生成中，请稍候（可能需几十秒）…"
                    : !testingMode && balance < 1
                      ? "次数不足"
                      : "立即生成"}
                </button>
              ) : (
                <Link
                  href="/login?next=/generate"
                  className="mt-1 flex w-full items-center justify-center rounded-full bg-[#FF9D3C] py-3.5 text-sm font-bold text-[#0F0E0C] shadow-lg shadow-[#FF9D3C]/15 transition hover:bg-[#ffb05a]"
                >
                  登录后开始生成
                </Link>
              )}
            </form>
          </div>

          {/* 右栏：预览（图一右侧） */}
          <div className="order-1 flex min-h-[420px] flex-col rounded-2xl border border-zinc-800/90 bg-[#141210] p-6 shadow-2xl lg:order-2 lg:min-h-[560px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-white">生成预览</h2>
                <p className="mt-1 text-xs text-zinc-500">生成完成后展示于此；签名链接约 48 小时内有效。</p>
              </div>
            </div>

            <div className="relative mt-5 flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl border border-dashed border-zinc-700 bg-[#0c0b0a] lg:min-h-[420px]">
              {loading ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#0F0E0C]/75 backdrop-blur-sm">
                  <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#FF9D3C] border-t-transparent" aria-hidden />
                  <span className="text-sm font-medium text-[#FF9D3C]">正在创作…</span>
                </div>
              ) : null}

              {imageUrl ? (
                <div className="flex flex-1 items-center justify-center p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="生成结果"
                    className="max-h-[min(70vh,640px)] w-full object-contain"
                  />
                </div>
              ) : !isLoggedIn ? (
                <div className="flex flex-1 flex-col items-stretch justify-center gap-3 p-4">
                  <p className="text-center text-xs font-medium uppercase tracking-wide text-[#FF9D3C]">
                    布局示意 · 非您的生成结果
                  </p>
                  <div className="relative overflow-hidden rounded-lg border border-zinc-700 bg-black/40">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={DEMO_PREVIEW_SRC}
                      alt="预览区布局示意"
                      className="mx-auto max-h-[min(55vh,480px)] w-full object-cover opacity-90"
                    />
                  </div>
                  <p className="text-center text-sm text-zinc-500">
                    登录后在此查看你的真实出图；左侧可先熟悉选项与提示词。
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="text-sm text-zinc-500">填写左侧参数后点击「立即生成」</p>
                  <p className="text-xs text-zinc-600">画质与宽高比将随请求提交至上游接口</p>
                </div>
              )}
            </div>

            {jobId ? (
              <p className="mt-4 text-xs text-zinc-500">
                任务 ID：<span className="font-mono text-zinc-400">{jobId}</span>
              </p>
            ) : null}
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-zinc-600">
          请勿生成违法、侵权或低俗内容。生成结果仅供参考，商用请自行确认版权与合规。
        </p>
      </div>
    </div>
  );
}
