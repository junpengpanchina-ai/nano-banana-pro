import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TestNoteCell } from "@/components/dashboard/TestNoteCell";
import { resolveJobImageHref } from "@/lib/dashboard/resolve-job-image-url";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  const { data: jobs } = await supabase
    .from("image_jobs")
    .select(
      "id, prompt, model, model_label, status, image_url, storage_path, price_cny, error_message, test_note, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const jobsWithHref = await Promise.all(
    (jobs ?? []).map(async (row) => ({
      ...row,
      displayImageUrl: await resolveJobImageHref(row),
    })),
  );

  const { data: recharges } = await supabase
    .from("recharge_records")
    .select("id, amount_cny, images_added, payment_method, note, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">我的记录</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        查看剩余次数、各模型生成记录与测试备注。已落 Storage 的图片每次打开本页会重新签发{" "}
        <span className="font-medium">48 小时</span> 有效链接。充值由运营在 Supabase 人工录入。
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">剩余可生成张数</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {profile?.balance_images ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">账号</p>
          <p className="mt-2 truncate text-lg font-medium text-zinc-900 dark:text-zinc-50">{profile?.email}</p>
          <p className="mt-1 text-sm text-zinc-500">昵称：{profile?.display_name ?? "—"}</p>
        </div>
      </section>

      <div className="mt-6">
        <Link
          href="/generate"
          className="inline-flex rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          去生成
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">生成记录</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">展示名</th>
                <th className="px-3 py-2 font-medium">模型 id</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">计价</th>
                <th className="px-3 py-2 font-medium">提示词</th>
                <th className="px-3 py-2 font-medium">图</th>
                <th className="px-3 py-2 font-medium">测试备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {jobsWithHref.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-zinc-500">
                    暂无记录
                  </td>
                </tr>
              ) : (
                jobsWithHref.map((row) => (
                  <tr key={row.id} className="bg-white dark:bg-zinc-950">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                      {row.model_label ?? "—"}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs text-zinc-500" title={row.model}>
                      {row.model}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.status === "succeeded"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : row.status === "failed"
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-600 dark:text-amber-400"
                        }
                      >
                        {row.status}
                      </span>
                      {row.status === "failed" && row.error_message ? (
                        <p className="mt-1 max-w-xs truncate text-xs text-zinc-500" title={row.error_message}>
                          {row.error_message}
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums text-zinc-700 dark:text-zinc-300">
                      {row.price_cny != null ? `¥${Number(row.price_cny).toFixed(2)}` : "—"}
                    </td>
                    <td className="max-w-[140px] truncate px-3 py-2 text-zinc-700 dark:text-zinc-200" title={row.prompt}>
                      {row.prompt}
                    </td>
                    <td className="px-3 py-2">
                      {row.displayImageUrl ? (
                        <a
                          href={row.displayImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-700 underline dark:text-amber-300"
                        >
                          打开
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-2 py-2 align-top">
                      <TestNoteCell jobId={row.id} initialNote={row.test_note} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">充值记录</h2>
        <p className="mt-1 text-sm text-zinc-500">由运营在数据库中登记后显示。</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">金额</th>
                <th className="px-3 py-2 font-medium">加张数</th>
                <th className="px-3 py-2 font-medium">方式</th>
                <th className="px-3 py-2 font-medium">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {(recharges ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                    暂无充值记录
                  </td>
                </tr>
              ) : (
                recharges!.map((r) => (
                  <tr key={r.id} className="bg-white dark:bg-zinc-950">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">¥{Number(r.amount_cny).toFixed(2)}</td>
                    <td className="px-3 py-2 tabular-nums">{r.images_added}</td>
                    <td className="px-3 py-2">{r.payment_method}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-zinc-600" title={r.note ?? ""}>
                      {r.note ?? "—"}
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
