"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_TEST_NOTE = 2000;

export type UpdateTestNoteResult = { ok: true } | { ok: false; error: string };

export async function updateImageJobTestNote(jobId: string, testNote: string): Promise<UpdateTestNoteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "请先登录" };
  }

  const note = testNote.trim().slice(0, MAX_TEST_NOTE);
  const admin = createAdminClient();

  const { data: row, error: fetchError } = await admin
    .from("image_jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false, error: "记录不存在或无权修改" };
  }

  const { error: updateError } = await admin.from("image_jobs").update({ test_note: note || null }).eq("id", jobId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  return { ok: true };
}
