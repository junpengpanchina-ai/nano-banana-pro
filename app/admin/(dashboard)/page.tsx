import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const { count: userCount, error: userCountErr } = await admin
    .from("profiles")
    .select("*", { count: "exact", head: true });

  const { count: jobCount, error: jobCountErr } = await admin
    .from("image_jobs")
    .select("*", { count: "exact", head: true });

  const { data: recentLogs, error: logErr } = await admin
    .from("admin_balance_logs")
    .select("id, user_id, delta_images, balance_after, operator_email, created_at")
    .order("created_at", { ascending: false })
    .limit(8);

  const cards = [
    { label: "注册用户", value: userCountErr ? "—" : String(userCount ?? 0), hint: "profiles 行数" },
    { label: "生成任务（累计）", value: jobCountErr ? "—" : String(jobCount ?? 0), hint: "image_jobs 行数" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">总览</h1>
      <p className="mt-2 max-w-2xl text-sm text-zinc-400">
        与用户端分离的管理控制台。用户、积分与审计请从左侧进入对应模块。
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-zinc-800/90 bg-[#121110] p-5 shadow-sm shadow-black/20"
          >
            <p className="text-sm text-zinc-500">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{c.value}</p>
            <p className="mt-1 text-xs text-zinc-600">{c.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/admin/users", title: "用户与账号", desc: "列表、创建、删除" },
          { href: "/admin/credits", title: "积分调整", desc: "加减 balance_images" },
          { href: "/admin/pricing", title: "模型定价", desc: "每模型消耗积分" },
          { href: "/admin/audit", title: "审计日志", desc: "全局积分流水" },
        ].map((x) => (
          <Link
            key={x.href}
            href={x.href}
            className="group rounded-2xl border border-zinc-800 bg-[#0F0E0C] p-4 transition hover:border-[#FF9D3C]/40 hover:bg-[#161412]"
          >
            <p className="font-medium text-white group-hover:text-[#FF9D3C]">{x.title}</p>
            <p className="mt-1 text-xs text-zinc-500">{x.desc}</p>
          </Link>
        ))}
      </div>

      <section className="mt-12">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-white">最近积分审计</h2>
          <Link href="/admin/audit" className="text-sm text-[#FF9D3C] hover:underline">
            查看全部
          </Link>
        </div>
        {logErr ? (
          <p className="mt-4 text-sm text-red-400">无法加载：{logErr.message}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#0c0b0a] text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">时间</th>
                  <th className="px-3 py-2 font-medium">用户</th>
                  <th className="px-3 py-2 font-medium">Δ</th>
                  <th className="px-3 py-2 font-medium">之后</th>
                  <th className="px-3 py-2 font-medium">操作者</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {(recentLogs ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                      暂无记录
                    </td>
                  </tr>
                ) : (
                  recentLogs!.map((row) => (
                    <tr key={row.id} className="bg-[#0F0E0C]">
                      <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs text-zinc-500" title={row.user_id}>
                        {row.user_id}
                      </td>
                      <td
                        className={`px-3 py-2 tabular-nums font-medium ${
                          (row.delta_images as number) > 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {(row.delta_images as number) > 0 ? "+" : ""}
                        {row.delta_images}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-zinc-200">{row.balance_after}</td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-zinc-400" title={row.operator_email}>
                        {row.operator_email}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
