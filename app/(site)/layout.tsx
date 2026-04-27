import { SiteHeader } from "@/components/SiteHeader";

/**
 * 用户向页面：顶栏 + 主内容。与 `app/admin` 控制台视觉隔离。
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
