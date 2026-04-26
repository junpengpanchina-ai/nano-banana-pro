export type ImageModelConfig = {
  /** 上游真实 model 字段 */
  id: string;
  /** 前端展示名 */
  label: string;
  description: string;
  /** 后台记账用（元），当前前端不展示；非内测时每次成功扣 1 次 balance_images */
  priceCny: number;
  enabled: boolean;
};

/**
 * 占位 id 需按上游实际支持的模型名替换。
 * 服务端以本配置为准，不信任前端传来的价格。
 */
export const IMAGE_MODELS: ImageModelConfig[] = [
  {
    id: "nano-banana-fast",
    label: "Nano Banana Fast",
    description: "与官方文档示例 model 一致；通用测试、快速出图。",
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
