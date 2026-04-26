/**
 * 内测阶段：不校验、不扣 `profiles.balance_images`，仍写入 `image_jobs` 与 Storage。
 * 正式上线启用余额前，在环境变量中关闭（删除或设为 0/false）。
 */
export function isGenerationTestingMode(): boolean {
  const v = process.env.GENERATION_TESTING_MODE?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}
