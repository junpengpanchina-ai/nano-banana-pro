import { createAdminClient } from "@/lib/supabase/admin";
import { AdminCreateUserForm } from "@/components/admin/AdminCreateUserForm";
import { AdminDeleteUserForm } from "@/components/admin/AdminDeleteUserForm";

export default async function AdminUsersPage() {
  const admin = createAdminClient();

  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, email, display_name, balance_images, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold text-white">用户与账号</h1>
      <p className="mt-2 text-sm text-zinc-400">查看用户、在 Auth 中新建账号，或永久删除用户（级联数据）。</p>

      {pErr ? <p className="mt-6 text-sm text-red-400">无法加载用户列表：{pErr.message}</p> : null}

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-medium text-white">新增账号</h2>
          <AdminCreateUserForm />
        </div>
        <div>
          <h2 className="text-lg font-medium text-white">删除账号</h2>
          <AdminDeleteUserForm />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-white">用户列表</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#0c0b0a] text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">UUID</th>
                <th className="px-3 py-2 font-medium">邮箱</th>
                <th className="px-3 py-2 font-medium">昵称</th>
                <th className="px-3 py-2 font-medium">积分</th>
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
    </div>
  );
}
