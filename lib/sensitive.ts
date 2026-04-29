/**
 * Minimal prompt guard — expand in Supabase Edge or here as you learn abuse patterns.
 * Blocks only obvious high-risk tokens; not a substitute for Terms of Use + human review.
 */
const BLOCKLIST: string[] = [
  // Sexual content (incl. minors)
  "nude",
  "naked",
  "nsfw",
  "porn",
  "色情",
  "裸",
  "裸照",
  "露点",
  "成人视频",
  "约炮",
  "强奸",
  "性侵",
  "loli",
  "幼女",
  "未成年人色情",
  "child porn",
  "儿童色情",
  "炼铜",

  // Gambling
  "赌博",
  "博彩",
  "赌场",
  "下注",
  "赌钱",
  "开盘",
  "体育博彩",

  // Human trafficking / exploitation
  "贩卖人口",
  "人口贩卖",
  "买卖人口",
  "拐卖人口",
  "拐卖儿童",
  "奴隶",
  "强迫卖淫",

  // Organ trade / harvesting
  "器官买卖",
  "买肾",
  "卖肾",
  "器官交易",
  "活体器官",
  "器官贩卖",

  // Terror / violence / weapons (obvious)
  "terrorist",
  "恐怖袭击",
  "bomb making",
  "制作炸弹",
  "自制炸弹",

  // Political extremism / separatism / anti-state (per product policy)
  "分裂国家",
  "割裂",
  "反国家",
  "颠覆国家",
  "煽动颠覆",
  "台独",
  "港独",
  "疆独",
  "藏独",

  // National leaders / senior officials (per product policy)
  "国家领导人",
  "总书记",
  "国家主席",
  "习近平",
  "李强",
];

export function findSensitiveKeywordHit(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const word of BLOCKLIST) {
    if (word.length >= 2 && lower.includes(word.toLowerCase())) {
      return word;
    }
  }
  return null;
}

/** Backward-compatible helper (default zh-CN message). Prefer i18n via `validatePromptInput`. */
export function promptFailsSensitiveCheck(prompt: string): string | null {
  const hit = findSensitiveKeywordHit(prompt);
  if (!hit) return null;
  return `提示词包含禁止内容（命中关键词：“${hit}”）。请调整后再试。`;
}
