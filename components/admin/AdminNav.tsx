"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: { href: string; label: string }[] = [
  { href: "/admin", label: "总览" },
  { href: "/admin/users", label: "用户与账号" },
  { href: "/admin/credits", label: "积分调整" },
  { href: "/admin/pricing", label: "模型定价" },
  { href: "/admin/audit", label: "审计日志" },
];

function navActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type Props = {
  operatorEmail: string;
};

export function AdminNav({ operatorEmail }: Props) {
  const pathname = usePathname() ?? "";

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-zinc-800/90 bg-[#0c0b0a] md:w-56 md:border-b-0 md:border-r md:border-zinc-800/90">
      <div className="flex items-center gap-2 border-b border-zinc-800/80 px-4 py-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF9D3C] text-sm font-bold text-[#0F0E0C]">
          A
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">管理控制台</p>
          <p className="truncate text-xs text-zinc-500">Nana Image Lab</p>
        </div>
      </div>
      <nav className="flex flex-row gap-1 overflow-x-auto p-2 md:flex-col md:gap-0.5 md:overflow-visible md:p-3">
        {NAV.map((item) => {
          const active = navActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition md:whitespace-normal ${
                active
                  ? "bg-[#FF9D3C]/15 text-[#FF9D3C] ring-1 ring-[#FF9D3C]/30"
                  : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden border-t border-zinc-800/80 p-3 text-xs text-zinc-500 md:block">
        <p className="truncate" title={operatorEmail}>
          当前：{operatorEmail}
        </p>
        <Link href="/dashboard" className="mt-2 inline-block font-medium text-[#FF9D3C] hover:underline">
          返回用户中心 →
        </Link>
        <Link href="/generate" className="mt-1 block font-medium text-zinc-400 hover:text-zinc-200">
          去创作页 →
        </Link>
      </div>
    </aside>
  );
}
