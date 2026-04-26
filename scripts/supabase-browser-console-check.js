/**
 * 浏览器自检（Supabase 公网配置）
 *
 * 用法：
 * 1. 打开你的站点（与线上相同域名，便于核对已部署的 env）。
 * 2. F12 → Console，整段粘贴运行（或分段粘贴）。
 * 3. 按提示输入 Project URL 与 anon key（来自 Supabase → Settings → API；不要贴 service_role）。
 *
 * 注意：不要在公开场合粘贴真实 key。
 */

(async () => {
  const urlRaw = (prompt("NEXT_PUBLIC_SUPABASE_URL（只要 https://xxx.supabase.co，不要 /rest/v1）") || "").trim();
  const anon = (prompt("NEXT_PUBLIC_SUPABASE_ANON_KEY（anon public，整段 JWT）") || "").trim();
  if (!urlRaw || !anon) {
    console.log("已取消");
    return;
  }

  const base = urlRaw.replace(/\/+$/, "");
  console.log("\n=== [A] URL 形态 ===");
  console.log("原始:", urlRaw);
  console.log("用于请求的根:", base);
  const shapeOk = /^https:\/\/[0-9a-z-]+\.supabase\.co$/i.test(base);
  console.log("是否符合客户端要求:", shapeOk);
  if (!shapeOk) {
    console.warn("若含 /rest/v1、/dashboard 等，请改 Vercel 环境变量后 Redeploy。");
  }

  const health = `${base}/auth/v1/health`;
  console.log("\n=== [B] Auth health（带 apikey 头）===");
  try {
    const r = await fetch(health, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
    const t = await r.text();
    console.log("URL:", health);
    console.log("HTTP:", r.status);
    console.log("Body(前400):", t.slice(0, 400));
  } catch (e) {
    console.error("fetch 失败:", e);
  }

  const testEmail = `probe_${Date.now()}@example.com`;
  console.log("\n=== [C] 试注册（假邮箱，用于看接口是否通；可能返回已禁用/策略错误，重点看 HTTP 与 JSON）===");
  console.log("使用测试邮箱:", testEmail);
  try {
    const r = await fetch(`${base}/auth/v1/signup`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${anon}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: testEmail, password: "TestProbe123!@#" }),
    });
    const t = await r.text();
    console.log("HTTP:", r.status);
    console.log("Body(前800):", t.slice(0, 800));
    if (r.status === 200) console.log("→ 接口可达；若 JSON 里有 user 无 session，多为「需邮箱确认」。");
    if (r.status === 400 || r.status === 422) console.log("→ 读 Body 里 msg / error_description，多为策略或格式。");
  } catch (e) {
    console.error("signup fetch 失败:", e);
  }

  console.log(
    "\n=== 结束 ===\n把 [A][B][C] 的 HTTP 状态 + Body 前几句（打码 key）发给维护者即可。\n真实注册请在注册页操作，勿重复使用弱密码邮箱。",
  );
})();
