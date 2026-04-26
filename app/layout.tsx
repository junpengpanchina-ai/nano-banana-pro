import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 图片生成小工具",
  description: "按张计费的朋友圈配图与素材生成，先充值后使用。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
        <SiteHeader />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
