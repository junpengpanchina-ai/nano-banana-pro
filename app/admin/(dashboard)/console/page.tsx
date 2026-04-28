import { getAdminEnvDiagnostics } from "@/lib/admin-debug";
import { readAdminSession } from "@/lib/admin-session";

export default async function AdminConsolePage() {
  const env = getAdminEnvDiagnostics();
  const sess = await readAdminSession();

  const rows: { key: string; value: string }[] = [
    { key: "后台会话", value: sess ? `已登录（${sess.username}）` : "（未登录）" },
    { key: "NEXT_PUBLIC_SUPABASE 已配置", value: env.publicSupabaseConfigured ? "是" : "否" },
    { key: "ADMIN 后台鉴权已配置", value: env.adminAuthConfigured ? "是" : `否（缺少：${env.adminAuthMissing || "—"}）` },
    { key: "SUPABASE_SERVICE_ROLE_KEY 已配置", value: env.serviceRoleConfigured ? "是" : "否" },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold text-white">环境与会话</h1>
      <p className="mt-2 text-sm text-zinc-400">
        服务端可读的配置摘要（不展示任何密钥）。用于排查 admin 登录与后台接口问题。浏览器 DevTools → Console
        里的 extension / background.js 报错多来自插件，可忽略或用无痕窗口验证。
      </p>

      <div className="mt-8 overflow-hidden rounded-2xl border border-zinc-800 bg-[#121110]">
        <table className="min-w-full text-left text-sm">
          <tbody className="divide-y divide-zinc-800">
            {rows.map((r) => (
              <tr key={r.key} className="bg-[#0F0E0C]">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-zinc-500">{r.key}</th>
                <td className="px-4 py-3 font-mono text-xs text-zinc-200 break-all">{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10 rounded-2xl border border-zinc-800 bg-[#0c0b0a] p-4">
        <h2 className="text-sm font-medium text-white">浏览器控制台（DevTools → Console）</h2>
        <p className="mt-2 text-xs text-zinc-500">
          粘贴下面一行回车，仅打印当前路径与时间（与上表对照排查）。Console 里大量{" "}
          <code className="font-mono text-zinc-400">background.js</code> /{" "}
          <code className="font-mono text-zinc-400">ERR_FILE_NOT_FOUND</code> 多为浏览器插件，可忽略或用无痕窗口。
        </p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-black/50 p-3 text-[11px] leading-relaxed text-emerald-400/90">
          {`console.log("[Nana admin]", { path: location.pathname, at: new Date().toISOString() });`}
        </pre>
      </section>
    </div>
  );
}
