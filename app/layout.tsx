import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nana Image Lab · AI 图片生成",
  description: "多模型对比与生成记录，深色沉浸式体验（内测）。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseReady = isSupabaseConfigured();
  const onVercel = process.env.VERCEL === "1";

  return (
    <html lang="zh-Hans" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0F0E0C] font-sans text-zinc-100">
        {!supabaseReady ? (
          <div
            role="status"
            className="border-b border-amber-500/40 bg-amber-950/40 px-4 py-2 text-center text-sm text-amber-100"
          >
            {onVercel ? (
              <>
                当前部署未读取到 Supabase 公网变量。请在 Vercel 项目 → <strong className="font-semibold">Settings → Environment Variables</strong>{" "}
                中为 <strong className="font-semibold">Production</strong>（及需要的话 Preview）填写{" "}
                <code className="rounded bg-black/30 px-1 font-mono">NEXT_PUBLIC_SUPABASE_URL</code> 与{" "}
                <code className="rounded bg-black/30 px-1 font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>，保存后重新部署。
              </>
            ) : (
              <>
                本地预览：未配置 Supabase。请复制{" "}
                <code className="rounded bg-black/30 px-1 font-mono">.env.example</code> 为{" "}
                <code className="rounded bg-black/30 px-1 font-mono">.env.local</code> 并填写 URL 与 anon key。
              </>
            )}
          </div>
        ) : null}
        <SiteHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
