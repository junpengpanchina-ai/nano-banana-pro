import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "nb_admin_session";

type AdminSessionPayload = {
  v: 1;
  sid: string;
  username: string;
  iat: number;
  exp: number;
};

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function getAdminUsername(): string {
  return env("ADMIN_USERNAME") || "admin";
}

function getAdminPassword(): string {
  const p = env("ADMIN_PASSWORD");
  if (p) return p;
  // 本地默认值：避免生产环境误用硬编码密码
  if (process.env.NODE_ENV !== "production") return "peng000000";
  return "";
}

function getSessionSecret(): string {
  const s = env("ADMIN_SESSION_SECRET");
  if (s) return s;
  if (process.env.NODE_ENV !== "production") return "dev-only-admin-session-secret-change-me";
  return "";
}

export function adminSessionConfigured(): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!env("ADMIN_PASSWORD") && process.env.NODE_ENV === "production") missing.push("ADMIN_PASSWORD");
  if (!env("ADMIN_SESSION_SECRET") && process.env.NODE_ENV === "production") missing.push("ADMIN_SESSION_SECRET");
  return { ok: missing.length === 0, missing };
}

function sign(encoded: string, secret: string): string {
  return createHmac("sha256", secret).update(encoded).digest("base64url");
}

function verifySig(encoded: string, sig: string, secret: string): boolean {
  const expected = sign(encoded, secret);
  const a = Buffer.from(sig, "base64url");
  const b = Buffer.from(expected, "base64url");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createAdminSessionValue(username: string, ttlSeconds = 60 * 60 * 12): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    v: 1,
    sid: randomUUID(),
    username,
    iat: now,
    exp: now + Math.max(60, Math.trunc(ttlSeconds)),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const secret = getSessionSecret();
  const sig = sign(encoded, secret);
  return `${encoded}.${sig}`;
}

export async function readAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value ?? "";
  if (!raw) return null;
  const [encoded, sig] = raw.split(".", 2);
  if (!encoded || !sig) return null;
  const secret = getSessionSecret();
  if (!secret) return null;
  if (!verifySig(encoded, sig, secret)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AdminSessionPayload;
    if (!payload || payload.v !== 1) return null;
    if (!payload.username) return null;
    if (!payload.exp || typeof payload.exp !== "number") return null;
    const now = Math.floor(Date.now() / 1000);
    if (now >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function requireAdminSession(): Promise<{ username: string }> {
  const sess = await readAdminSession();
  if (!sess) {
    throw new Error("ADMIN_UNAUTHORIZED");
  }
  return { username: sess.username };
}

export function verifyAdminCredentials(usernameRaw: string, passwordRaw: string): boolean {
  const u = usernameRaw.trim();
  const p = passwordRaw;
  const expectedU = getAdminUsername();
  const expectedP = getAdminPassword();
  if (!expectedP) return false;
  return u === expectedU && p === expectedP;
}

export function adminSessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.max(60, Math.trunc(maxAgeSeconds)),
  };
}

