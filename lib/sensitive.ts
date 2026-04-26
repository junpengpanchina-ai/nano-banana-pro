/**
 * Minimal prompt guard — expand in Supabase Edge or here as you learn abuse patterns.
 * Blocks only obvious high-risk tokens; not a substitute for Terms of Use + human review.
 */
const BLOCKLIST: string[] = [
  "nude",
  "naked",
  "nsfw",
  "porn",
  "loli",
  "child porn",
  "terrorist",
  "bomb making",
  "制作炸弹",
  "裸",
  "色情",
  "幼女",
  "恐怖袭击",
];

export function promptFailsSensitiveCheck(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  for (const word of BLOCKLIST) {
    if (word.length >= 2 && lower.includes(word.toLowerCase())) {
      return `Prompt contains disallowed content: "${word}"`;
    }
  }
  return null;
}
