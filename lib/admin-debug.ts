/**
 * 管理页「控制台」展示用：不含密钥，仅布尔与计数。
 */
export function getAdminEnvDiagnostics(): {
  publicSupabaseConfigured: boolean;
  adminAuthConfigured: boolean;
  adminAuthMissing: string;
  serviceRoleConfigured: boolean;
} {
  const hasPass = Boolean(process.env.ADMIN_PASSWORD?.trim());
  const hasSecret = Boolean(process.env.ADMIN_SESSION_SECRET?.trim());
  const missing: string[] = [];
  if (!hasPass) missing.push("ADMIN_PASSWORD");
  if (!hasSecret) missing.push("ADMIN_SESSION_SECRET");

  return {
    publicSupabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    ),
    adminAuthConfigured: hasPass && hasSecret,
    adminAuthMissing: missing.join(", "),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}
