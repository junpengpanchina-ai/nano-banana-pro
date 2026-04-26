/** 与上游 Nano Banana / Grsai 文档常见取值对齐；服务端白名单解析，不信任任意字符串。 */

export const IMAGE_SIZE_OPTIONS = ["1K", "2K", "4K"] as const;
export type ImageSizeOption = (typeof IMAGE_SIZE_OPTIONS)[number];

export const ASPECT_RATIO_OPTIONS = [
  "auto",
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
] as const;
export type AspectRatioOption = (typeof ASPECT_RATIO_OPTIONS)[number];

/**
 * @param allowed 若传入且非空，则必须在其中（用于如 nano-banana-fast 仅 1K）；否则回落到首项。
 */
export function parseImageSize(
  raw: unknown,
  allowed?: readonly ImageSizeOption[],
): ImageSizeOption {
  const v = typeof raw === "string" ? raw.trim() : "";
  let pick: ImageSizeOption = (IMAGE_SIZE_OPTIONS as readonly string[]).includes(v)
    ? (v as ImageSizeOption)
    : "1K";
  if (allowed && allowed.length > 0 && !allowed.includes(pick)) {
    pick = allowed[0]!;
  }
  return pick;
}

export function parseAspectRatio(raw: unknown): AspectRatioOption {
  const v = typeof raw === "string" ? raw.trim() : "";
  return (ASPECT_RATIO_OPTIONS as readonly string[]).includes(v) ? (v as AspectRatioOption) : "auto";
}
