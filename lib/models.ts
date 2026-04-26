import type { ImageSizeOption } from "@/lib/generation-draw-params";
import { IMAGE_SIZE_OPTIONS } from "@/lib/generation-draw-params";

export type ImageModelConfig = {
  /** 服务内使用的模型标识（与绘图服务约定一致） */
  id: string;
  /** 前端展示名 */
  label: string;
  /** 仅面向用户：适合场景与优势，不写积分或第三方名称 */
  description: string;
  /** 后台记账用（元），当前前端不展示；非内测时每次成功扣 1 次 balance_images */
  priceCny: number;
  enabled: boolean;
  /**
   * 不填 = 支持 1K / 2K / 4K。
   * Fast 仅开放 1K；界面上仍会显示三档按钮，不可用的档位禁用。
   */
  allowedImageSizes?: readonly ImageSizeOption[];
};

/**
 * 可选模型列表（不含 gpt-image-2）。
 * 服务端仅接受此表内的 `id`；`submitGenerateImage` 与绘图请求均以此为准。
 */
export const IMAGE_MODELS: ImageModelConfig[] = [
  {
    id: "nano-banana-fast",
    label: "Nano Banana Fast",
    description: "响应快，适合草图、试词和快速迭代。",
    priceCny: 0.44,
    enabled: true,
    allowedImageSizes: ["1K"],
  },
  {
    id: "nano-banana-pro",
    label: "Nano Banana Pro",
    description: "综合画质与指令理解，适合正式出稿与产品主图。",
    priceCny: 1.8,
    enabled: true,
  },
  {
    id: "nano-banana-2",
    label: "Nano Banana 2",
    description: "速度与细节更均衡，适合日常创作与社交素材。",
    priceCny: 1.2,
    enabled: true,
  },
  {
    id: "nano-banana-pro-vt",
    label: "Nano Banana Pro VT",
    description: "强化文字与版式，海报、封面、带字画面更稳。",
    priceCny: 1.8,
    enabled: true,
  },
  {
    id: "nano-banana-pro-cl",
    label: "Nano Banana Pro CL",
    description: "高细节与一致性，复杂场景与精修向。",
    priceCny: 6,
    enabled: true,
  },
];

/** 当前模型实际可选画质；未配置则三档全开 */
export function allowedImageSizesFor(model: ImageModelConfig): readonly ImageSizeOption[] {
  if (model.allowedImageSizes && model.allowedImageSizes.length > 0) {
    return model.allowedImageSizes;
  }
  return IMAGE_SIZE_OPTIONS;
}

export function getImageModel(modelId: string): ImageModelConfig | null {
  const m = IMAGE_MODELS.find((model) => model.id === modelId && model.enabled);
  return m ?? null;
}

export function getEnabledImageModels(): ImageModelConfig[] {
  return IMAGE_MODELS.filter((m) => m.enabled);
}
