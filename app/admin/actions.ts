"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AdminAdjustResult = { ok: true } | { ok: false; error: string };

export type AdminFormState = AdminAdjustResult | null;

/**
 * 为用户增加或减少 balance_images；写 admin_balance_logs；增加时同步写 recharge_records 便于用户 Dashboard「充值记录」。
 */
export async function adminAdjustBalance(
  userIdRaw: string,
  deltaImagesRaw: number,
  noteRaw: string | null,
): Promise<AdminAdjustResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return { ok: false, error: "无权限" };
  }

  const userId = userIdRaw.trim();
  if (!UUID_RE.test(userId)) {
    return { ok: false, error: "用户 ID 格式无效" };
  }

  const delta = Math.trunc(Number(deltaImagesRaw));
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: "变更张数须为非零整数" };
  }
  if (delta > 5000 || delta < -5000) {
    return { ok: false, error: "单次变更张数绝对值过大（±5000 内）" };
  }

  const note = (noteRaw ?? "").trim().slice(0, 500) || null;
  const admin = createAdminClient();

  const { data: profile, error: pErr } = await admin
    .from("profiles")
    .select("balance_images, email")
    .eq("id", userId)
    .maybeSingle();

  if (pErr || !profile) {
    return { ok: false, error: "用户不存在" };
  }

  const current = profile.balance_images as number;
  const next = Math.max(0, current + delta);
  if (next === current && delta < 0) {
    return { ok: false, error: "余额已为 0，无法继续扣减" };
  }

  const { error: upErr } = await admin.from("profiles").update({ balance_images: next }).eq("id", userId);
  if (upErr) {
    return { ok: false, error: upErr.message ?? "更新余额失败" };
  }

  const { error: logErr } = await admin.from("admin_balance_logs").insert({
    user_id: userId,
    delta_images: delta,
    balance_after: next,
    note,
    operator_email: user.email,
  });
  if (logErr) {
    await admin.from("profiles").update({ balance_images: current }).eq("id", userId);
    return { ok: false, error: logErr.message ?? "写入审计失败，已回滚余额" };
  }

  if (delta > 0) {
    const { error: rcErr } = await admin.from("recharge_records").insert({
      user_id: userId,
      amount_cny: 0,
      images_added: delta,
      payment_method: "admin",
      note: note ? `后台加张 · ${note}` : "后台加张",
    });
    if (rcErr) {
      // 余额与审计已生效；充值流水失败不阻断，仅记录
      console.error("adminAdjustBalance recharge_records insert:", rcErr.message);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** `<form action={…}>` / useActionState 入口 */
export async function adminAdjustBalanceForm(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const userIdRaw = String(formData.get("userId") ?? "");
  const deltaRaw = formData.get("delta");
  const delta = typeof deltaRaw === "string" ? Number(deltaRaw) : Number(deltaRaw);
  const noteRaw = String(formData.get("note") ?? "");
  return adminAdjustBalance(userIdRaw, delta, noteRaw);
}
