import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminAuditPage() {
  const admin = createAdminClient();

  const { data: logs, error: lErr } = await admin
    .from("admin_balance_logs")
    .select("id, user_id, delta_images, balance_after, note, operator_email, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold text-white">审计日志</h1>
      <p className="mt-2 text-sm text-zinc-400">后台人工调整积分记录（最近 200 条）。</p>

      {lErr ? (
        <p className="mt-6 text-sm text-red-400">无法加载：{lErr.message}</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#0c0b0a] text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">用户 UUID</th>
                <th className="px-3 py-2 font-medium">Δ 积分</th>
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
                    <td className="max-w-[160px] truncate px-3 py-2 font-mono text-xs text-zinc-500" title={row.user_id}>
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
                    <td className="max-w-[220px] truncate px-3 py-2 text-zinc-500" title={row.note ?? ""}>
                      {row.note ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
