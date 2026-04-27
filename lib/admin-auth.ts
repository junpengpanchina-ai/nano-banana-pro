/**
 * 运营后台：通过环境变量 `ADMIN_EMAILS` 逗号分隔邮箱（小写比对）授权。
 * 例：ADMIN_EMAILS=you@corp.com,ops@corp.com
 */
export function getAdminEmailSet(): Set<string> {
  const raw = process.env.ADMIN_EMAILS?.trim() ?? "";
  const parts = raw
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return new Set(parts);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmailSet().has(email.trim().toLowerCase());
}
