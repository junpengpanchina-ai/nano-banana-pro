import type { Metadata } from "next";

/** 仅包裹子路由；鉴权与 AdminShell 在 `(dashboard)/layout`；`/admin/login` 不在其内。 */
export const metadata: Metadata = {
  title: "管理 · Nana Image Lab",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
