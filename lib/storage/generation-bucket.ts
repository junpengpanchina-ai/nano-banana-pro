/** Storage bucket for persisted renders; create in Supabase Dashboard → Storage if missing */
export function getGenerationBucket(): string {
  return process.env.SUPABASE_GENERATION_BUCKET?.trim() || "generations";
}

/** Signed URL lifetime for stored images (seconds) */
export const STORAGE_IMAGE_TTL_SECONDS = 48 * 60 * 60;
