const FALLBACK = "zh-CN";

function canonicalize(tag: string): string {
  const t = tag.trim();
  if (!t) return "";
  // basic: language[-REGION]
  const [langRaw, regionRaw] = t.split(/[-_]/);
  const lang = (langRaw || "").toLowerCase();
  if (!lang) return "";
  if (!regionRaw) return lang;
  const region = regionRaw.toUpperCase();
  return `${lang}-${region}`;
}

/**
 * Normalize user/browser locale into one of our supported tags.
 * Examples:
 * - "zh-CN" / "zh-cn" -> "zh-CN"
 * - "zh-TW" -> "zh-TW"
 * - "pt-BR" -> "pt-BR"
 * - "en-US" -> "en"
 */
export function normalizeLocale(input?: string | null): string {
  const c = canonicalize(input ?? "");
  if (!c) return FALLBACK;
  if (c.startsWith("zh-")) {
    if (c === "zh-TW" || c === "zh-HK" || c === "zh-MO") return "zh-TW";
    return "zh-CN";
  }
  if (c.startsWith("pt-")) {
    if (c === "pt-BR") return "pt-BR";
    return "pt-PT";
  }
  // Return only language for most locales.
  const lang = c.split("-")[0]!;
  return lang || FALLBACK;
}

