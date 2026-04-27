import { IMAGE_MODELS } from "@/lib/models";

export default function AdminPricingPage() {
  const rows = IMAGE_MODELS.filter((m) => m.enabled);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold text-white">模型定价（积分）</h1>
      <p className="mt-2 text-sm text-zinc-400">
        与用户端创作页一致：每次<strong className="text-zinc-300">成功</strong>生成后按模型扣除{" "}
        <span className="font-mono text-zinc-300">creditsPerGeneration</span>。修改请编辑仓库{" "}
        <span className="font-mono text-zinc-300">lib/models.ts</span> 并重新部署。
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#0c0b0a] text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">模型 id</th>
              <th className="px-3 py-2 font-medium">展示名</th>
              <th className="px-3 py-2 font-medium">每次消耗积分</th>
              <th className="px-3 py-2 font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {rows.map((m) => (
              <tr key={m.id} className="bg-[#0F0E0C]">
                <td className="px-3 py-2 font-mono text-xs text-zinc-400">{m.id}</td>
                <td className="px-3 py-2 text-zinc-200">{m.label}</td>
                <td className="px-3 py-2 tabular-nums font-semibold text-[#FF9D3C]">{m.creditsPerGeneration}</td>
                <td className="px-3 py-2 text-emerald-400/90">已启用</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
