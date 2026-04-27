"use client";

import Link from "next/link";
import { useState } from "react";
import { submitGenerateImage, submitReferenceImage } from "@/app/generate/actions";
import { MAX_PROMPT_LENGTH } from "@/lib/constants";
import {
  ASPECT_RATIO_OPTIONS,
  IMAGE_SIZE_OPTIONS,
  type ImageSizeOption,
} from "@/lib/generation-draw-params";

export type GenerateModelOption = {
  id: string;
  label: string;
  description: string;
  /** 与 `lib/models.ts` 一致；缺省则三档画质均可选 */
  allowedImageSizes?: ImageSizeOption[];
};

type Props = {
  /** 未登录也可浏览页面；仅登录后可提交生成 */
  isLoggedIn: boolean;
  /**
   * 与 `GENERATION_TESTING_MODE` + `ANONYMOUS_GENERATE_AS_USER_ID` 同时开启时：未登录也可生成（记入池用户）。
   */
  anonymousGenerateEnabled?: boolean;
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

const MAX_REFERENCE_IMAGES = 10;

type ReferenceSlot = { id: string; previewUrl: string; signedUrl: string };

export function GenerateClient({
  isLoggedIn,
  anonymousGenerateEnabled = false,
  initialBalance,
  models,
  testingMode = false,
}: Props) {
  const canAct = isLoggedIn || anonymousGenerateEnabled;
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
  const [referenceItems, setReferenceItems] = useState<ReferenceSlot[]>([]);
  const [referenceUploading, setReferenceUploading] = useState(false);

  function allowedSizesForModelId(id: string): ImageSizeOption[] {
    const m = models.find((x) => x.id === id);
    if (m?.allowedImageSizes && m.allowedImageSizes.length > 0) return [...m.allowedImageSizes];
    return [...IMAGE_SIZE_OPTIONS];
  }

  function selectModel(nextId: string) {
    setModelId(nextId);
    const allowed = allowedSizesForModelId(nextId);
    setImageSize((prev) => (allowed.includes(prev) ? prev : (allowed[0] ?? "1K")));
  }

  async function addReferenceFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    if (!canAct) {
      setError("请先登录后再上传参考图");
      return;
    }
    setError(null);
    setReferenceUploading(true);
    try {
      const room = MAX_REFERENCE_IMAGES - referenceItems.length;
      if (room <= 0) {
        setError(`参考图最多 ${MAX_REFERENCE_IMAGES} 张`);
        return;
      }
      const added: ReferenceSlot[] = [];
      let skippedType = false;
      for (const file of files) {
        if (added.length >= room) break;
        const lower = file.name.toLowerCase();
        const okType =
          file.type.startsWith("image/") &&
          (lower.endsWith(".jpg") ||
            lower.endsWith(".jpeg") ||
            lower.endsWith(".png") ||
            lower.endsWith(".webp"));
        if (!okType) {
          skippedType = true;
          continue;
        }
        const form = new FormData();
        form.set("file", file);
        const res = await submitReferenceImage(form);
        if (!res.ok) {
          setError(res.error);
          break;
        }
        const localPreview = URL.createObjectURL(file);
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        added.push({ id, previewUrl: localPreview, signedUrl: res.signedUrl });
        if (added.length >= MAX_REFERENCE_IMAGES) break;
      }
      if (skippedType && added.length === 0 && files.length > 0) {
        setError("仅支持 JPG、PNG、WEBP");
      }
      if (added.length > 0) {
        setReferenceItems((prev) => [...prev, ...added].slice(0, MAX_REFERENCE_IMAGES));
      }
    } finally {
      setReferenceUploading(false);
    }
  }

  function removeReference(id: string) {
    setReferenceItems((prev) => {
      const row = prev.find((x) => x.id === id);
      if (row?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(row.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!canAct) return;
    setError(null);
    setImageUrl(null);
    setJobId(null);
    setLoading(true);
    try {
      const refUrls = referenceItems.length > 0 ? referenceItems.map((r) => r.signedUrl) : undefined;
      const data = await submitGenerateImage(
        prompt.trim(),
        modelId,
        testNote.trim() || null,
        aspectRatio,
        imageSize,
        refUrls,
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

  const hasRefs = referenceItems.length > 0;
  const promptOk =
    (!hasRefs && prompt.trim().length >= 1) || (hasRefs && prompt.trim().length >= 5);

  const canSubmit =
    canAct &&
    !loading &&
    !referenceUploading &&
    !!modelId &&
    (testingMode || balance >= 1) &&
    promptOk;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#0F0E0C] text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-8 lg:py-10">
        {anonymousGenerateEnabled && !isLoggedIn ? (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
            <strong className="font-semibold text-[#FF9D3C]">免登录批量测试已开启</strong>
            ：生成任务会记在配置的测试用户下，不扣次数（内测模式）。测完后请在环境变量中关闭{" "}
            <code className="rounded bg-black/30 px-1 font-mono text-xs">GENERATION_TESTING_MODE</code> 与{" "}
            <code className="rounded bg-black/30 px-1 font-mono text-xs">ANONYMOUS_GENERATE_AS_USER_ID</code>{" "}
            并重新部署。
          </div>
        ) : !isLoggedIn ? (
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
              Nana Image Lab <span className="font-semibold text-[#FF9D3C]">AI</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">
              左侧一次完成：<strong className="font-semibold text-zinc-300">提示词</strong>（有参考图时至少 5 字）与
              <strong className="font-semibold text-zinc-300"> 可选参考图</strong>；右侧预览生成结果。
            </p>
          </div>
          {!isLoggedIn && anonymousGenerateEnabled ? (
            <div className="rounded-full border border-[#FF9D3C]/40 bg-[#FF9D3C]/10 px-4 py-2 text-sm font-semibold text-[#FF9D3C]">
              免登录测试{testingMode ? " · 不限次数" : ""}
            </div>
          ) : !isLoggedIn ? (
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
            <form className="flex flex-col gap-5" onSubmit={handleGenerate}>
              <div className="flex flex-col gap-2">
                <span className={labelCls}>选择模型</span>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {models.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => selectModel(m.id)}
                      className={`rounded-xl border p-3 text-left transition sm:p-3.5 ${
                        modelId === m.id
                          ? "border-[#FF9D3C] bg-[#FF9D3C]/12 ring-1 ring-[#FF9D3C]/45"
                          : "border-zinc-700 bg-[#121110] hover:border-zinc-500"
                      }`}
                    >
                      <span className="font-semibold text-white">{m.label}</span>
                      <p className="mt-1.5 line-clamp-3 text-xs leading-snug text-zinc-500">{m.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3" role="group" aria-label="画质 Image Size">
                <span className={labelCls}>画质（Image Size）</span>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {IMAGE_SIZE_OPTIONS.map((s) => {
                    const allowed = allowedSizesForModelId(modelId);
                    const enabled = allowed.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        disabled={!enabled}
                        title={enabled ? undefined : "当前模型不支持该档位"}
                        onClick={() => {
                          if (enabled) setImageSize(s);
                        }}
                        className={`rounded-xl border-2 py-3 text-center text-sm font-bold tracking-wide transition sm:py-3.5 sm:text-base ${
                          !enabled
                            ? "cursor-not-allowed border-zinc-800/80 bg-zinc-900/50 text-zinc-600 opacity-55"
                            : imageSize === s
                              ? "border-[#FF9D3C] bg-[#FF9D3C] text-[#0F0E0C] shadow-[0_0_24px_rgba(255,157,60,0.28)]"
                              : "border-zinc-700 bg-[#121110] text-zinc-300 hover:border-zinc-500 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>

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

              <div className="flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-[#121110]/60 p-4 ring-1 ring-zinc-800/40">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className={labelCls}>提示词与参考图</span>
                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                      同一组输入一并提交：仅文字时提示词至少 1 字；<strong className="font-medium text-zinc-400">上传参考图后</strong>
                      提示词至少 5 字。参考图选填。
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                    {prompt.length}/{MAX_PROMPT_LENGTH}
                  </span>
                </div>
                <textarea
                  id="generate-prompt"
                  required
                  minLength={1}
                  rows={6}
                  maxLength={MAX_PROMPT_LENGTH}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述画面，例如：极简电商主图、白底、一盏台灯…"
                  aria-label="生成提示词"
                  className={`${input} min-h-[140px] resize-y`}
                />
                <div className="border-t border-zinc-800/70 pt-3">
                  <p className="mb-2 text-xs text-zinc-500">
                    <span className="font-medium text-zinc-400">参考图</span>
                    选填 · 拖入或点击上传（最多 10 张）· JPG / PNG / WEBP，单张 ≤10MB
                  </p>
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void addReferenceFiles(e.dataTransfer.files);
                    }}
                    className={`relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 py-5 transition ${
                      canAct
                        ? "border-zinc-600 bg-[#0F0E0C]/80 hover:border-[#FF9D3C]/45 hover:bg-zinc-900/30"
                        : "cursor-not-allowed border-zinc-800 bg-zinc-900/20 opacity-70"
                    }`}
                  >
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                      multiple
                      className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      disabled={!canAct || referenceUploading || referenceItems.length >= MAX_REFERENCE_IMAGES}
                      onChange={(e) => {
                        const fl = e.target.files;
                        if (fl?.length) void addReferenceFiles(fl);
                        e.target.value = "";
                      }}
                    />
                    <span className="text-sm text-zinc-400">
                      {canAct ? "拖拽图片到此处，或点击选择文件" : "登录后可上传参考图"}
                    </span>
                    {referenceUploading ? (
                      <span className="text-xs font-medium text-[#FF9D3C]">正在上传…</span>
                    ) : null}
                  </label>
                  {referenceItems.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {referenceItems.map((r) => (
                        <div
                          key={r.id}
                          className="group relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-700 bg-black"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={r.previewUrl} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeReference(r.id)}
                            className="absolute right-0.5 top-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100"
                          >
                            移除
                          </button>
                        </div>
                      ))}
                      <span className="self-center text-xs tabular-nums text-zinc-500">
                        {referenceItems.length}/{MAX_REFERENCE_IMAGES}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

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

              {canAct ? (
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mt-1 w-full rounded-full bg-[#FF9D3C] py-3.5 text-sm font-bold text-[#0F0E0C] shadow-lg shadow-[#FF9D3C]/15 transition hover:bg-[#ffb05a] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {loading
                    ? "生成中，请稍候（可能需几十秒）…"
                    : !testingMode && balance < 1
                      ? "次数不足"
                      : !promptOk
                        ? hasRefs
                          ? "提示词至少 5 个字"
                          : "请输入提示词"
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
                <p className="mt-1 text-xs text-zinc-500">生成完成后将在此展示；链接在一段时间后可能需重新打开页面刷新。</p>
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
              ) : !canAct ? (
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
                  <p className="text-xs text-zinc-600">灰色画质按钮表示当前模型不支持该清晰度。</p>
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
