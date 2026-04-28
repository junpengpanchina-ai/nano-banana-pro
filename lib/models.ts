import type { ImageSizeOption } from "@/lib/generation-draw-params";
import { IMAGE_SIZE_OPTIONS } from "@/lib/generation-draw-params";

export type ImageModelConfig = {
  /** 服务内使用的模型标识（与绘图服务约定一致） */
  id: string;
  /** 前端展示名 */
  label: string;
  /** 仅面向用户：适合场景与优势，不写积分或第三方名称 */
  description: string;
  /**
   * 每次成功生成从 `profiles.balance_images`（积分余额）扣除的积分数。
   * 库列名仍为 balance_images，语义为「积分」。
   */
  creditsPerGeneration: number;
  /** 后台记账用（元），当前前端不展示 */
  priceCny: number;
  enabled: boolean;
  /**
   * 不填 = 支持 1K / 2K / 4K。
   * Fast 仅开放 1K；界面上仍会显示三档按钮，不可用的档位禁用。
   */
  allowedImageSizes?: readonly ImageSizeOption[];
};

/**
 * 上游 `id` 须与供应商文档一致；仅改 `label`/`description`/`enabled` 不影响对接。
 * `nano-banana-pro-vt` 默认关闭；`gpt-image-2` 以供应商实际 model 字符串为准（不一致请改 `id`）。
 */
export const IMAGE_MODELS: ImageModelConfig[] = [
  {
    id: "nano-banana-fast",
    label: "Nana Fast",
    description: "快速便宜向：草图、试词、批量迭代。",
    creditsPerGeneration: 10,
    priceCny: 0.44,
    enabled: true,
    allowedImageSizes: ["1K"],
  },
  {
    id: "nano-banana",
    label: "Nana Standard",
    description: "标准均衡：效果与速度折中，适合大多数日常出图。",
    creditsPerGeneration: 20,
    priceCny: 1.2,
    enabled: true,
  },
  {
    id: "nano-banana-pro",
    label: "Nana Pro",
    description: "通用主力：正式出稿、产品主图与默认首选。",
    creditsPerGeneration: 30,
    priceCny: 1.8,
    enabled: true,
  },
  {
    id: "nano-banana-2",
    label: "Nana HD",
    description: "高质量均衡：电商主图、物料、封面类场景。",
    creditsPerGeneration: 10,
    priceCny: 1.2,
    enabled: true,
  },
  {
    id: "nano-banana-pro-vt",
    label: "Nano Banana Pro VT",
    description: "强化文字与版式，海报、封面、带字画面更稳。",
    creditsPerGeneration: 30,
    priceCny: 1.8,
    enabled: false,
  },
  {
    id: "nano-banana-pro-cl",
    label: "Nana Portrait",
    description: "高细节向：人像、写真、五官与肢体（复杂场景与精修）。",
    creditsPerGeneration: 30,
    priceCny: 6,
    enabled: true,
  },
  {
    id: "gpt-image-2",
    label: "GPT Image 2",
    description: "OpenAI GPT Image 线路（需要单独对接对应上游接口）；当前 draw 接口不支持，已临时关闭。",
    creditsPerGeneration: 20,
    priceCny: 2,
    enabled: false,
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
