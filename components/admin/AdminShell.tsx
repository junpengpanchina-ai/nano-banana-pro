import Link from "next/link";
import { AdminNav } from "@/components/admin/AdminNav";

type Props = {
  children: React.ReactNode;
  operatorEmail: string;
};

/** 管理后台：侧栏导航 + 主工作区（无站点顶栏） */
export function AdminShell({ children, operatorEmail }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-[#080706] text-zinc-100 md:flex-row">
      <AdminNav operatorEmail={operatorEmail} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-zinc-800/80 bg-[#0F0E0C]/95 px-4 py-3 md:px-6">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Admin</p>
          <div className="flex items-center gap-3 md:hidden">
            <Link href="/dashboard" className="text-xs font-medium text-[#FF9D3C]">
              用户中心
            </Link>
            <Link href="/generate" className="text-xs font-medium text-zinc-400">
              创作
            </Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
