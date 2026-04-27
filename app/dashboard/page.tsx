import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TestNoteCell } from "@/components/dashboard/TestNoteCell";
import { resolveJobImageHref } from "@/lib/dashboard/resolve-job-image-url";
import { isGenerationTestingMode } from "@/lib/generation-testing-mode";

export default async function DashboardPage() {
  const testingMode = isGenerationTestingMode();
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
      "id, prompt, model, model_label, status, image_url, storage_path, error_message, test_note, created_at",
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

  const { data: balanceLogs } = await supabase
    .from("admin_balance_logs")
    .select("id, delta_images, balance_after, note, operator_email, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-zinc-100">
      <h1 className="text-2xl font-semibold text-white">我的记录</h1>
      <p className="mt-1 text-sm text-zinc-400">
        {testingMode ? (
          <>
            内测阶段不扣次数；生成记录与测试备注照常保存。已落 Storage 的图片每次打开本页会重新签发{" "}
            <span className="font-medium text-[#FF9D3C]">48 小时</span> 有效链接。
          </>
        ) : (
          <>
            剩余次数、生成记录与测试备注。已落 Storage 的图片每次打开本页会重新签发{" "}
            <span className="font-medium text-[#FF9D3C]">48 小时</span>{" "}
            有效链接。充值与后台加减张数会显示在下方表格（数据来自 Supabase）。
          </>
        )}
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-zinc-800 bg-[#161412] p-5">
          {testingMode ? (
            <>
              <p className="text-sm text-zinc-400">余额（内测不扣）</p>
              <p className="mt-2 text-lg font-semibold text-[#FF9D3C]">不限次数</p>
              <p className="mt-1 text-xs text-zinc-500">库内 balance_images 仍为 {profile?.balance_images ?? 0}，上线计费后可启用扣次。</p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-400">剩余可生成张数</p>
              <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{profile?.balance_images ?? 0}</p>
            </>
          )}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-[#161412] p-5">
          <p className="text-sm text-zinc-400">账号</p>
          <p className="mt-2 truncate text-lg font-medium text-white">{profile?.email}</p>
          <p className="mt-1 text-sm text-zinc-500">昵称：{profile?.display_name ?? "—"}</p>
        </div>
      </section>

      <div className="mt-6">
        <Link
          href="/generate"
          className="inline-flex rounded-full bg-[#FF9D3C] px-5 py-2.5 text-sm font-semibold text-[#0F0E0C] transition hover:bg-[#ffb05a]"
        >
          去创作
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-white">生成记录</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#121110] text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">展示名</th>
                <th className="px-3 py-2 font-medium">模型 id</th>
                <th className="px-3 py-2 font-medium">状态</th>
                <th className="px-3 py-2 font-medium">提示词</th>
                <th className="px-3 py-2 font-medium">图</th>
                <th className="px-3 py-2 font-medium">测试备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {jobsWithHref.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                    暂无记录
                  </td>
                </tr>
              ) : (
                jobsWithHref.map((row) => (
                  <tr key={row.id} className="bg-[#0F0E0C]">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                      {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-zinc-200">{row.model_label ?? "—"}</td>
                    <td className="max-w-[120px] truncate px-3 py-2 font-mono text-xs text-zinc-500" title={row.model}>
                      {row.model}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={
                          row.status === "succeeded"
                            ? "text-emerald-400"
                            : row.status === "failed"
                              ? "text-red-400"
                              : "text-[#FF9D3C]"
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
                    <td className="max-w-[140px] truncate px-3 py-2 text-zinc-300" title={row.prompt}>
                      {row.prompt}
                    </td>
                    <td className="px-3 py-2">
                      {row.displayImageUrl ? (
                        <a
                          href={row.displayImageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#FF9D3C] underline-offset-2 hover:underline"
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
        <h2 className="text-lg font-medium text-white">积分调整记录</h2>
        <p className="mt-1 text-sm text-zinc-500">运营后台加减张数的审计；与 profiles 余额一致。</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#121110] text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">变更</th>
                <th className="px-3 py-2 font-medium">之后余额</th>
                <th className="px-3 py-2 font-medium">操作者</th>
                <th className="px-3 py-2 font-medium">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(balanceLogs ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                    暂无调整记录
                  </td>
                </tr>
              ) : (
                balanceLogs!.map((r) => (
                  <tr key={r.id} className="bg-[#0F0E0C]">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                    <td
                      className={`px-3 py-2 tabular-nums font-medium ${
                        (r.delta_images as number) > 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {(r.delta_images as number) > 0 ? "+" : ""}
                      {r.delta_images}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-200">{r.balance_after}</td>
                    <td className="max-w-[160px] truncate px-3 py-2 text-zinc-300" title={r.operator_email}>
                      {r.operator_email}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-zinc-400" title={r.note ?? ""}>
                      {r.note ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-medium text-white">充值记录</h2>
        <p className="mt-1 text-sm text-zinc-500">含运营后台加张（payment_method 为 admin）及人工录入。</p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#121110] text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">时间</th>
                <th className="px-3 py-2 font-medium">金额</th>
                <th className="px-3 py-2 font-medium">加张数</th>
                <th className="px-3 py-2 font-medium">方式</th>
                <th className="px-3 py-2 font-medium">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {(recharges ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                    暂无充值记录
                  </td>
                </tr>
              ) : (
                recharges!.map((r) => (
                  <tr key={r.id} className="bg-[#0F0E0C]">
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-400">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-200">¥{Number(r.amount_cny).toFixed(2)}</td>
                    <td className="px-3 py-2 tabular-nums text-zinc-200">{r.images_added}</td>
                    <td className="px-3 py-2 text-zinc-300">{r.payment_method}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-zinc-400" title={r.note ?? ""}>
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
