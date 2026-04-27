/**
 * 管理页「控制台」展示用：不含密钥，仅布尔与计数。
 */
export function getAdminEnvDiagnostics(): {
  publicSupabaseConfigured: boolean;
  adminLoginEmailConfigured: boolean;
  adminEmailsConfigured: boolean;
  adminEmailRuleCount: number;
  serviceRoleConfigured: boolean;
} {
  const adminLogin = process.env.ADMIN_LOGIN_EMAIL?.trim() ?? "";
  const rawEmails = process.env.ADMIN_EMAILS?.trim() ?? "";
  const parts = rawEmails
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return {
    publicSupabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(),
    ),
    adminLoginEmailConfigured: adminLogin.includes("@"),
    adminEmailsConfigured: parts.length > 0,
    adminEmailRuleCount: parts.length,
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
  };
}
