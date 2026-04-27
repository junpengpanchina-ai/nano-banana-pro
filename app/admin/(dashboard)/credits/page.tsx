import { AdminCreditsForm } from "@/components/admin/AdminCreditsForm";

export default function AdminCreditsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-10">
      <h1 className="text-2xl font-semibold text-white">积分调整</h1>
      <p className="mt-2 text-sm text-zinc-400">
        直接修改 <span className="font-mono text-zinc-300">profiles.balance_images</span>（积分余额）。会写入{" "}
        <span className="font-mono text-zinc-300">admin_balance_logs</span>；增加时同时写入{" "}
        <span className="font-mono text-zinc-300">recharge_records</span>，用户可在「我的记录」中查看。
      </p>
      <section className="mt-8">
        <h2 className="sr-only">表单</h2>
        <AdminCreditsForm />
      </section>
    </div>
  );
}
