export type ImageModelConfig = {
  /** 上游真实 model 字段 */
  id: string;
  /** 前端展示名 */
  label: string;
  description: string;
  /** 单张对用户计价（元）；扣次仍为每次成功 1 次 balance_images */
  priceCny: number;
  enabled: boolean;
};

/**
 * 占位 id 需按上游实际支持的模型名替换。
 * 服务端以本配置为准，不信任前端传来的价格。
 */
export const IMAGE_MODELS: ImageModelConfig[] = [
  {
    id: "nano-banana-pro",
    label: "Nana Pro",
    description: "通用测试、稳定出图。",
    priceCny: 0.6,
    enabled: true,
  },
  {
    id: "nano-banana-fast",
    label: "Nana Fast",
    description: "快速草图、低成本测试。",
    priceCny: 0.6,
    enabled: true,
  },
  {
    id: "nano-banana-hd",
    label: "Nana HD",
    description: "海报、电商、细节图。",
    priceCny: 0.8,
    enabled: true,
  },
  {
    id: "nano-banana-portrait",
    label: "Nana Portrait",
    description: "头像、人物、写真。",
    priceCny: 0.8,
    enabled: true,
  },
  {
    id: "nano-banana-design",
    label: "Nana Design",
    description: "产品图、封面、营销素材。",
    priceCny: 0.8,
    enabled: true,
  },
  {
    id: "nano-banana-test",
    label: "Nana Test",
    description: "新模型灰度测试。",
    priceCny: 0.6,
    enabled: true,
  },
];

export function getImageModel(modelId: string): ImageModelConfig | null {
  const m = IMAGE_MODELS.find((model) => model.id === modelId && model.enabled);
  return m ?? null;
}

export function getEnabledImageModels(): ImageModelConfig[] {
  return IMAGE_MODELS.filter((m) => m.enabled);
}
