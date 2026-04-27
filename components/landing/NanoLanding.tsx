import Link from "next/link";
import type { ShowcaseItem } from "@/lib/showcase";

type Props = {
  isLoggedIn: boolean;
  balance: number | null;
  showcase: ShowcaseItem[];
  testingMode?: boolean;
};

export function NanoLanding({ isLoggedIn, balance, showcase, testingMode = false }: Props) {
  return (
    <div className="text-zinc-100">
      {/* 弱提示条 */}
      <div className="border-b border-zinc-800/80 bg-[#141210] px-4 py-2 text-center text-xs text-zinc-400">
        {isLoggedIn ? (
          testingMode ? (
            <span>已登录 · 内测期间生成不限次数</span>
          ) : (
            <>
              已登录 · 剩余可生成{" "}
              <span className="font-semibold text-[#FF9D3C] tabular-nums">{balance ?? "—"}</span> 次
            </>
          )
        ) : (
          <>
            登录即可使用完整功能 ·{" "}
            <Link href="/login" className="text-[#FF9D3C] underline-offset-2 hover:underline">
              去登录
            </Link>
            {" · "}
            <Link href="/signup" className="text-[#FF9D3C] underline-offset-2 hover:underline">
              注册
            </Link>
          </>
        )}
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-12 sm:pb-20 sm:pt-16">
        <p className="inline-flex rounded-full border border-[#FF9D3C]/35 bg-[#FF9D3C]/10 px-3 py-1 text-xs font-medium text-[#FF9D3C]">
          AI 图像 · 多模型测试台
        </p>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Nana Image Lab
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-zinc-400">
          先进的多模型图片生成与编辑流：理解中文提示词，适合朋友圈配图、电商主图、封面与草图迭代。先选模型，再一句话出图。
        </p>

        <div className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 rounded-full bg-[#FF9D3C] px-8 py-3.5 text-base font-semibold text-[#0F0E0C] shadow-lg shadow-[#FF9D3C]/20 transition hover:bg-[#ffb05a]"
          >
            立即开始创作
            <span aria-hidden>→</span>
          </Link>
          {!isLoggedIn ? (
            <Link
              href="/login"
              className="inline-flex rounded-full border border-zinc-600 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-white/5"
            >
              已有账号登录
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="inline-flex rounded-full border border-zinc-600 px-6 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-white/5"
            >
              查看我的记录
            </Link>
          )}
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <span className="rounded-full bg-[#5B8DEF]/20 px-3 py-1 text-xs font-medium text-[#8CB4FF]">
            一键出图
          </span>
          <span className="rounded-full bg-[#3DDC97]/15 px-3 py-1 text-xs font-medium text-[#6EEBB3]">
            多模型对比
          </span>
          <span className="rounded-full bg-[#9B7EDE]/20 px-3 py-1 text-xs font-medium text-[#C4B5FD]">
            自然语言描述
          </span>
        </div>
      </section>

      {/* 是什么 */}
      <section className="border-t border-zinc-800/80 bg-[#12110f] px-4 py-14 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF9D3C]">What is Nana Image Lab</p>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">什么是 Nana Image Lab？</h2>
          <p className="mt-4 max-w-3xl text-zinc-400 leading-relaxed">
            本站聚合多款绘图模型，便于你在真实业务场景里对比速度、画质与稳定性。生成结果会写入
            Supabase；精选作品可经运营在后台打上「首页展示」标记后，自动出现在下方图廊（与占位图混合展示直至凑满
            4 张）。
          </p>
        </div>
      </section>

      {/* 图廊 */}
      <section className="border-t border-zinc-800/80 px-4 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF9D3C]">Gallery</p>
          <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">画面展示</h2>
          <p className="mt-2 text-sm text-zinc-500">
            下方为示例与精选出图；后台配置 <code className="rounded bg-zinc-800 px-1 font-mono text-zinc-300">is_showcase</code>{" "}
            后替换为真实案例。
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {showcase.map((item) => (
              <figure
                key={item.id}
                className="group relative aspect-[5/7] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.src}
                  alt={item.alt}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pb-3 pt-10 text-xs text-zinc-200">
                  {item.fromDatabase ? "精选 · Nana Image Lab" : "示例画面 · Nana Image Lab"}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
