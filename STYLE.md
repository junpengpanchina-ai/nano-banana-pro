# 视觉与交互风格（Nano Banana 系）

面向「轻量 AI 图片站」的统一风格，对齐参考：**深色底 + 香蕉橙强调 + 首屏强 CTA + 下方图廊**。后续管理后台可沿用同一套 Token。

---

## 1. 色彩

| Token | 色值 | 用途 |
|--------|------|------|
| **背景主色** | `#0F0E0C` | 页面大底、沉浸感 |
| **表面/卡片** | `#161412`、`zinc-900/40` + `border-zinc-800` | 卡片、导航条底 |
| **主强调（香蕉橙）** | `#FF9D3C` | 主按钮、高亮标签、Logo 点缀 |
| **主按钮悬停** | `#ffb05a` 左右 | 略提亮 |
| **主标题** | `white` / `zinc-50` | Hero 标题 |
| **正文** | `zinc-400`～`zinc-500` | 说明、导航次要链接 |
| **弱分割线** | `zinc-800/80` | 顶栏、区块分隔 |

辅助标签色（功能胶囊，可选）：

- 蓝 `#5B8DEF`：一键 / 效率类  
- 绿 `#3DDC97`：多图 / 支持类  
- 紫 `#9B7EDE`：自然语言 / 智能类  

---

## 2. 字体与排版

- **字体栈**：系统无衬线（PingFang SC / Microsoft YaHei 等），不加额外 Webfont 亦可。  
- **Hero 标题**：字重 `font-semibold`～`font-bold`，`text-4xl`～`text-6xl`，`tracking-tight`。  
- **副标题**：`text-base`～`text-lg`，`text-zinc-400`，`leading-relaxed`。  
- **导航**：`text-sm`，默认 `text-zinc-400`，悬停 `text-white`。

---

## 3. 布局节奏（首页）

1. **顶栏**：Logo + 产品名；中间或右侧导航（生成 / 记录 / 登录）；已登录展示**剩余次数**胶囊（橙边或半透明底）。  
2. **首屏（Hero）**：  
   - 可选一条**弱提示条**（如登录获赠次数）。  
   - 主标题 + 一句话能力说明。  
   - **主 CTA 唯一强动作**：「立即开始创作」→ `/generate`（全站第一点击优先级）。  
   - 其下 2～3 个**功能胶囊**（短词 + 浅色底）。  
3. **「是什么」区块**：小徽章 + 二级标题 + 一段技术/能力说明（可提及多模型、提示词理解等）。  
4. **图廊**：横向 **4 列**（小屏 2 列），竖版比例约 **5:7**，圆角 `rounded-2xl`，底部渐变条 + 文案「由 Nano Banana AI 生成」类说明。  
5. **图廊数据来源（与 Supabase）**：  
   - 表 `image_jobs` 字段 **`is_showcase`**：`true` 表示上首页精选。  
   - 服务端用 **service_role** 拉取精选（不受用户 RLS 限制），并解析 `storage_path` 签发展示用链接。  
   - **不足 4 张**时用占位图（picsum）补齐，避免空白。  
   - **后续管理后台**：列表勾选「上首页」→ 更新 `is_showcase` 即可，无需改代码。

---

## 4. 组件形态

- **主按钮**：`rounded-full` 或 `rounded-2xl`，`bg-[#FF9D3C]`，`text-[#0F0E0C]`，`font-semibold`，内边距 `px-8 py-3.5`，可带右箭头图标。  
- **次按钮 / 幽灵**：描边 `border-zinc-600`，透明底，白字。  
- **徽章（Badge）**：`rounded-full`，`text-xs`，`px-3 py-1`，浅底 + 橙字或反色。  
- **图片卡片**：`overflow-hidden`，底部 `gradient-to-t from-black/80`，浮层白字小标题。

---

## 5. 全站其它页面

- **同一深色底**，表单区用略浅卡片底，保证对比度。  
- **表单主操作**仍用香蕉橙，与首页 CTA 一致。

---

## 6. 可访问性

- 橙底上的文字用深色 `#0F0E0C`，保证对比度。  
- 可点击区域保留足够 `padding`，移动端首屏 CTA 易于点击。

---

## 7. 文件对应

- 全局底色与字体：`app/globals.css`、`app/layout.tsx`  
- 首页结构：`components/landing/NanoLanding.tsx`  
- 精选图数据：`lib/showcase.ts` + 迁移 `20260428120000_image_jobs_showcase.sql`  
- 顶栏：`components/SiteHeader.tsx`

---

## 8. 运营 / 后台如何把图送上首页？

执行迁移后，在 **SQL Editor** 将某条成功任务标为精选（按实际 `id` 替换）：

```sql
update public.image_jobs
set is_showcase = true
where id = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
```

后续可做「管理后台」页面：列表勾选 → 调用同一逻辑更新 `is_showcase` 即可，无需改前端代码。
