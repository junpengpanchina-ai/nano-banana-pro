/**
 * 仅接受本站 Storage 刚签出的参考图链接（路径含当前用户 refs），防止把任意 URL 传给绘图接口。
 */
export function isTrustedUserReferenceSignedUrl(url: string, userId: string): boolean {
  const baseRaw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!baseRaw || !userId) return false;
  try {
    const u = new URL(url.trim());
    const b = new URL(baseRaw);
    if (u.origin !== b.origin) return false;
    if (!u.pathname.includes("/storage/v1/object/sign/")) return false;
    const decoded = decodeURIComponent(u.pathname + (u.search || ""));
    return decoded.includes(`${userId}/refs/`);
  } catch {
    return false;
  }
}

export function sanitizeReferenceImageUrls(
  raw: unknown,
  userId: string,
  maxCount: number,
): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (out.length >= maxCount) break;
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t || !isTrustedUserReferenceSignedUrl(t, userId)) continue;
    out.push(t);
  }
  return out;
}
