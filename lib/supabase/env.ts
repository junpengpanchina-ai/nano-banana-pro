/** 是否已配置 Supabase 公网项（用于登录、生成等真实能力） */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  return !!(url && anon);
}

/**
 * 未配置 .env 时用于避免服务端/客户端抛错，便于本地先看页面。
 * 使用不可路由 host；无有效 cookie 时 auth.getUser() 一般为 null。
 * 勿用于生产。
 */
export const SUPABASE_DEV_PLACEHOLDER_URL = "https://example.invalid";

/** 三段式 JWT 外形，非任意真实项目密钥 */
export const SUPABASE_DEV_PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5OTk5OTk5OTl9.local-preview-placeholder-signature";
