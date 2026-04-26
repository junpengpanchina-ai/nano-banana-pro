import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nano Banana · AI 图片生成",
  description: "多模型图片生成与记录，深色沉浸式体验。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabaseReady = isSupabaseConfigured();

  return (
    <html lang="zh-Hans" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0F0E0C] font-sans text-zinc-100">
        {!supabaseReady ? (
          <div
            role="status"
            className="border-b border-amber-500/40 bg-amber-950/40 px-4 py-2 text-center text-sm text-amber-100"
          >
            本地预览：未配置 Supabase。请复制{" "}
            <code className="rounded bg-black/30 px-1 font-mono">.env.example</code> 为{" "}
            <code className="rounded bg-black/30 px-1 font-mono">.env.local</code> 并填写 URL 与 anon key。
          </div>
        ) : null}
        <SiteHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
