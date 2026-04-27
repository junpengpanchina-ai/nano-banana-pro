import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminCreditsForm } from "@/components/admin/AdminCreditsForm";

export default async function AdminPage() {
  const admin = createAdminClient();

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, email, display_name, balance_images, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: logs, error: lErr } = await admin
    .from("admin_balance_logs")
    .select("id, user_id, delta_images, balance_after, note, operator_email, created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">运营 · 积分</h1>
          <p className="mt-1 text-sm text-zinc-400">
            调整 <span className="font-mono text-zinc-300">profiles.balance_images</span>，审计写入{" "}
            <span className="font-mono text-zinc-300">admin_balance_logs</span>；加张时同时写{" "}
            <span className="font-mono text-zinc-300">recharge_records</span>，用户可在「记录」页看到。
          </p>
        </div>
        <Link href="/dashboard" className="text-sm text-[#FF9D3C] hover:underline">
          返回记录
        </Link>
      </div>

      {pErr ? (
        <p className="mt-6 text-sm text-red-400">无法加载用户列表：{pErr.message}</p>
      ) : null}
      {lErr ? (
        <p className="mt-6 text-sm text-red-400">无法加载审计：{lErr.message}（请先执行迁移创建 admin_balance_logs）</p>
      ) : null}

      <section className="mt-8">
        <h2 className="text-lg font-medium text-white">调整余额</h2>
        <AdminCreditsForm />
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-white">最近用户</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#121110] text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">UUID</th>
                <th className="px-3 py-2 font-medium">邮箱</th>
                <th className="px-3 py-2 font-medium">昵称</th>
                <th className="px-3 py-2 font-medium">余额</th>
                <th className="px-3 py-2 font-medium">注册</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(profiles ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                    暂无用户
                  </td>
                </tr>
              ) : (
                profiles!.map((row) => (
                  <tr key={row.id} className="bg-[#0F0E0C]">
                    <td className="max-w-[200px] truncate px-3 py-2 font-mono text-xs text-zinc-400" title={row.id}>
                      {row.id}
                    </td>
                    <td className="max-w-[180px] truncate px-3 py-2 text-zinc-200" title={row.email ?? ""}>
                      {row.email ?? "—"}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-zinc-300">{row.display_name ?? "—"}</td>
                    <td className="px-3 py-2 tabular-nums text-[#FF9D3C]">{row.balance_images}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-white">全局审计（最近）</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#121110] text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">用户</th>
                <th className="px-3 py-2 font-medium">Δ</th>
                <th className="px-3 py-2 font-medium">之后</th>
                <th className="px-3 py-2 font-medium">操作者</th>
                <th className="px-3 py-2 font-medium">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(logs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-zinc-500">
                    暂无审计记录
                  </td>
                </tr>
              ) : (
                logs!.map((row) => (
                  <tr key={row.id} className="bg-[#0F0E0C]">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 font-mono text-xs text-zinc-500" title={row.user_id}>
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
                    <td className="max-w-[160px] truncate px-3 py-2 text-zinc-300" title={row.operator_email}>
                      {row.operator_email}
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2 text-zinc-500" title={row.note ?? ""}>
                      {row.note ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
