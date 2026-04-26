import { createAdminClient } from "@/lib/supabase/admin";
import { resolveJobImageHref } from "@/lib/dashboard/resolve-job-image-url";

export type ShowcaseItem = {
  id: string;
  src: string;
  alt: string;
  /** true = 来自 image_jobs 精选；false = 占位图（未配置或未选够时） */
  fromDatabase?: boolean;
};

/** 占位图：接好 Supabase 并设置 is_showcase 后，首页会优先展示库内精选 */
const STATIC_SHOWCASE: ShowcaseItem[] = [
  { id: "static-1", src: "https://picsum.photos/seed/nanobanana1/400/560", alt: "示例画面 1" },
  { id: "static-2", src: "https://picsum.photos/seed/nanobanana2/400/560", alt: "示例画面 2" },
  { id: "static-3", src: "https://picsum.photos/seed/nanobanana3/400/560", alt: "示例画面 3" },
  { id: "static-4", src: "https://picsum.photos/seed/nanobanana4/400/560", alt: "示例画面 4" },
];

/**
 * 首页展示图：优先 `image_jobs.is_showcase = true` 且成功、有图；
 * 不足 4 张时用占位图补齐。需 `SUPABASE_SERVICE_ROLE_KEY`；未配置或查询失败则仅占位图。
 */
export async function getLandingShowcase(): Promise<ShowcaseItem[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return STATIC_SHOWCASE;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("image_jobs")
      .select("id, image_url, storage_path")
      .eq("is_showcase", true)
      .eq("status", "succeeded")
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error || !data?.length) {
      return STATIC_SHOWCASE;
    }

    const fromDb: ShowcaseItem[] = [];
    for (const row of data) {
      const src = await resolveJobImageHref(row);
      if (!src) continue;
      fromDb.push({
        id: row.id,
        src,
        alt: "精选出图",
        fromDatabase: true,
      });
      if (fromDb.length >= 4) break;
    }

    if (fromDb.length >= 4) {
      return fromDb.slice(0, 4);
    }

    const merged = [...fromDb];
    for (const s of STATIC_SHOWCASE) {
      if (merged.length >= 4) break;
      merged.push({ ...s, id: `${s.id}-${merged.length}` });
    }
    return merged.slice(0, 4);
  } catch {
    return STATIC_SHOWCASE;
  }
}
