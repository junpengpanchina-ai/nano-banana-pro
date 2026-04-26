import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSignedUrlForStoragePath } from "@/lib/storage/persist-job-image";

/**
 * 为已有任务重新签发 Storage 图片的 48h 签名 URL（仅本人任务、且存在 storage_path）。
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const jobId = new URL(request.url).searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ ok: false, error: "jobId required" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("image_jobs")
    .select("id, user_id, storage_path, image_url")
    .eq("id", jobId)
    .maybeSingle();

  if (error || !row || row.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  }

  if (!row.storage_path) {
    return NextResponse.json({
      ok: true,
      url: row.image_url,
      source: "upstream_or_legacy",
    });
  }

  const admin = createAdminClient();
  const signed = await createSignedUrlForStoragePath(admin, row.storage_path);
  if (!signed) {
    return NextResponse.json({ ok: false, error: "Could not sign URL" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, url: signed, source: "storage" });
}
