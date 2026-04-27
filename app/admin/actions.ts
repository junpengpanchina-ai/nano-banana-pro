"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin-auth";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AdminFormState = { ok: true; message?: string } | { ok: false; error: string } | null;

/**
 * 为用户增加或减少积分（`profiles.balance_images`）；写 admin_balance_logs；增加时同步写 recharge_records。
 */
export async function adminAdjustBalance(
  userIdRaw: string,
  deltaRaw: number,
  noteRaw: string | null,
): Promise<AdminFormState> {
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

  const delta = Math.trunc(Number(deltaRaw));
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: "变更积分须为非零整数" };
  }
  if (delta > 200_000 || delta < -200_000) {
    return { ok: false, error: "单次变更积分绝对值过大（±200000 内）" };
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
    return { ok: false, error: "积分已为 0，无法继续扣减" };
  }

  const { error: upErr } = await admin.from("profiles").update({ balance_images: next }).eq("id", userId);
  if (upErr) {
    return { ok: false, error: upErr.message ?? "更新积分失败" };
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
    return { ok: false, error: logErr.message ?? "写入审计失败，已回滚积分" };
  }

  if (delta > 0) {
    const { error: rcErr } = await admin.from("recharge_records").insert({
      user_id: userId,
      amount_cny: 0,
      images_added: delta,
      payment_method: "admin",
      note: note ? `后台加积分 · ${note}` : "后台加积分",
    });
    if (rcErr) {
      console.error("adminAdjustBalance recharge_records insert:", rcErr.message);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/credits");
  revalidatePath("/admin/audit");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function adminAdjustBalanceForm(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const userIdRaw = String(formData.get("userId") ?? "");
  const deltaRaw = formData.get("delta");
  const delta = typeof deltaRaw === "string" ? Number(deltaRaw) : Number(deltaRaw);
  const noteRaw = String(formData.get("note") ?? "");
  return adminAdjustBalance(userIdRaw, delta, noteRaw);
}

async function resolveProfileUserId(admin: ReturnType<typeof createAdminClient>, raw: string): Promise<string | null> {
  const t = raw.trim();
  if (!t) return null;
  if (UUID_RE.test(t)) return t;
  const lower = t.toLowerCase();
  const { data: byLower } = await admin.from("profiles").select("id").eq("email", lower).maybeSingle();
  if (byLower?.id) return byLower.id as string;
  const { data: byExact } = await admin.from("profiles").select("id").eq("email", t).maybeSingle();
  if (byExact?.id) return byExact.id as string;
  return null;
}

/** 在 Supabase Auth 创建用户（触发器会建 profiles）；初始积分 0。 */
export async function adminCreateUserForm(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return { ok: false, error: "无权限" };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_RE.test(email)) {
    return { ok: false, error: "邮箱格式无效" };
  }
  if (password.length < 6) {
    return { ok: false, error: "密码至少 6 位（与 Supabase 默认策略一致）" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "创建用户失败（邮箱可能已存在）" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return {
    ok: true,
    message: `已创建用户，UUID：${data.user.id}（请提醒对方用该邮箱登录）`,
  };
}

/** 删除 Auth 用户（级联删除 profiles、其任务等，慎用）。支持 UUID 或注册邮箱。 */
export async function adminDeleteUserForm(_prev: AdminFormState, formData: FormData): Promise<AdminFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return { ok: false, error: "无权限" };
  }

  const raw = String(formData.get("target") ?? "").trim();
  if (!raw) {
    return { ok: false, error: "请填写用户 UUID 或邮箱" };
  }

  const admin = createAdminClient();
  const targetId = await resolveProfileUserId(admin, raw);
  if (!targetId) {
    return { ok: false, error: "未找到该用户（请检查 UUID 或邮箱）" };
  }

  if (targetId === user.id) {
    return { ok: false, error: "不能删除当前登录的管理员账号" };
  }

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) {
    return { ok: false, error: error.message ?? "删除失败" };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { ok: true, message: "已从 Auth 删除该用户及其关联数据。" };
}
