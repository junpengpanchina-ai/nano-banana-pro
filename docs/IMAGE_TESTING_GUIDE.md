# 图片生成联调与测试指南（独立文档）

> 本文档面向 **Nano Banana 图片链路**（Grsai `POST /v1/draw/nano-banana` + `POST /v1/draw/result`）。视频接口仅留档，见 `docs/UPSTREAM_SORA2_VIDEO_API.md`。

---

## 1. 测试目标

- 验证 **Supabase**（Auth、`profiles`、`image_jobs`、可选 Storage）配置正确。
- 验证 **上游绘图**（创建任务 → 轮询结果）可用。
- 验证站点 **`/generate`** 或 **`POST /api/image/generate`** 端到端成功。

---

## 2. 前置条件

| 项 | 说明 |
|----|------|
| Node | 建议与仓库一致（见 `package.json` engines 若有） |
| Supabase 项目 | 已创建；已执行迁移（见下文「迁移顺序」） |
| 上游账号 | 具备 `UPSTREAM_API_KEY`（Bearer） |
| 网络 | 能访问所选 Host（国内直连或海外） |

---

## 3. 环境变量（`.env.local` 或部署平台）

### 3.1 必配：Supabase

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 项目 API URL（HTTPS） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon 公钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role，**仅服务端**，勿加 `NEXT_PUBLIC_` |

### 3.2 必配：上游图片

| 变量 | 说明 |
|------|------|
| `UPSTREAM_API_KEY` | Bearer Token |

**二选一配置 URL：**

**方式 A（推荐）：完整 URL**

```env
UPSTREAM_DRAW_URL=https://grsai.dakka.com.cn/v1/draw/nano-banana
UPSTREAM_RESULT_URL=https://grsai.dakka.com.cn/v1/draw/result
```

海外节点将 Host 换为上游文档中的海外地址即可。

**方式 B：Host + Path**

```env
UPSTREAM_BASE_URL=https://grsai.dakka.com.cn
UPSTREAM_DRAW_PATH=/v1/draw/nano-banana
UPSTREAM_RESULT_PATH=/v1/draw/result
```

### 3.3 可选

| 变量 | 说明 |
|------|------|
| `UPSTREAM_REFERENCE_URLS` | 默认合并进请求体 `urls`（逗号/换行/JSON 数组） |
| `UPSTREAM_ASPECT_RATIO` | 默认 `auto` |
| `UPSTREAM_BANANA_IMAGE_SIZE` | 默认 `1K` |
| `UPSTREAM_POLL_INTERVAL_MS` | 默认 `2000` |
| `SUPABASE_GENERATION_BUCKET` | 默认 `generations`；需在 Supabase 创建私有桶 |
| `GENERATION_TESTING_MODE` | `1` / `true` / `yes`：成功**不扣** `balance_images`，仍写库 |
| `ANONYMOUS_GENERATE_AS_USER_ID` | 须与 `GENERATION_TESTING_MODE` 同时启用；值为已有 `profiles` 的用户 UUID |

---

## 4. 与上游文档的对应关系（Grsai Nano Banana）

| 文档概念 | 本仓库实现 |
|----------|------------|
| `POST /v1/draw/nano-banana` | `UPSTREAM_DRAW_URL` 或 `BASE + UPSTREAM_DRAW_PATH` |
| `POST /v1/draw/result` | `UPSTREAM_RESULT_URL` 或 `BASE + UPSTREAM_RESULT_PATH` |
| `webHook: "-1"` | 代码内固定为立即返回任务 `id`，便于轮询 |
| 请求体 `model` / `prompt` / `aspectRatio` / `imageSize` / `urls` | 见 `lib/upstream/image-generation.ts` |
| 结果 `status`: `running` / `succeeded` / `failed` | 轮询直至成功、失败或超时（约 120s） |

---

## 5. Supabase 迁移建议顺序

在 **SQL Editor** 依次执行（或 `supabase db push`）：

1. `supabase/migrations/20260426140000_init.sql`
2. `supabase/migrations/20260427120000_image_jobs_model_label.sql`
3. `supabase/migrations/20260428100000_job_image_storage.sql`
4. `supabase/migrations/20260428120000_image_jobs_showcase.sql`
5. `supabase/migrations/20260428140000_image_jobs_aspect_size.sql`
6. `supabase/migrations/20260428180000_admin_balance_logs.sql`（若使用后台审计）
7. `supabase/migrations/20260429100000_image_jobs_credits_charged.sql`

> 若缺少 `image_jobs.credits_charged` 列，新版本写库可能失败；代码已对缺列做过兜底，仍建议尽快执行第 7 条。

---

## 6. 本地启动

```bash
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase 与上游变量

npm install
npm run dev
```

浏览器打开终端提示的地址（一般为 `http://localhost:3000`）。

---

## 7. 浏览器测试（推荐）

1. 注册/登录：`/signup` 或 `/login`。
2. 打开 **`/generate`**，选择模型、可选宽高比与画质，输入提示词（有参考图时提示词至少 **5** 字）。
3. 点击生成，右侧应出现结果图；失败时页面会展示错误文案（含常见排障提示）。

**积分：** 非内测模式下，`profiles.balance_images` 须 ≥ 当前模型所需积分（见 `lib/models.ts` 的 `creditsPerGeneration`）。内测可设 `GENERATION_TESTING_MODE=1`。

---

## 8. HTTP 接口测试

### 8.1 提示词校验（不写库、不调上游）

```bash
curl -sS -X POST "http://localhost:3000/api/prompt" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"一只猫"}' | jq .
```

### 8.2 生图（与页面逻辑一致）

**须携带已登录用户的 Cookie**（与浏览器同源会话）。示例（把 `Cookie` 换成你从 DevTools → Application → Cookies 里复制的整段）：

```bash
curl -sS -X POST "http://localhost:3000/api/image/generate" \
  -H "Content-Type: application/json" \
  -H "Cookie: <从浏览器复制的 Cookie>" \
  -d '{
    "prompt": "一只可爱的猫在草地上，插画风格",
    "modelId": "nano-banana-fast",
    "aspectRatio": "auto",
    "imageSize": "1K"
  }' | jq .
```

成功时 JSON 含 `ok: true`、`jobId`、`imageUrl`、`balanceImages` 等。

---

## 9. 可选：直连上游自检（绕过本站）

用于确认 **密钥与 Host** 可用（勿在公开场合粘贴真实 `apikey`）：

```bash
# 1) 创建任务（webHook -1 立即返回 id）
TASK_JSON=$(curl -sS -X POST "https://grsai.dakka.com.cn/v1/draw/nano-banana" \
  -H "Authorization: Bearer <UPSTREAM_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "model":"nano-banana-fast",
    "prompt":"一只猫",
    "aspectRatio":"auto",
    "imageSize":"1K",
    "urls":[],
    "webHook":"-1",
    "shutProgress":false
  }')

echo "$TASK_JSON"
# 从返回 JSON 中取出 data.id，记为 TASK_ID

# 2) 轮询结果
curl -sS -X POST "https://grsai.dakka.com.cn/v1/draw/result" \
  -H "Authorization: Bearer <UPSTREAM_API_KEY>" \
  -H "Content-Type: application/json" \
  -d "{\"id\":\"<TASK_ID>\"}" | jq .
```

---

## 10. 模型 id 白名单

以仓库 **`lib/models.ts`** 中 **`enabled: true`** 的项为准；`modelId` 必须与上游文档中的 `model` 字符串一致（例如 `nano-banana-fast`、`nano-banana` 等）。

---

## 11. 常见问题速查

| 现象 | 处理方向 |
|------|----------|
| 「请在部署环境配置 UPSTREAM_DRAW_URL…」 | 补全 draw/result 的 URL 或 BASE+PATH |
| 「服务未配置上游密钥」 | 配置 `UPSTREAM_API_KEY` |
| 「积分不足」 | 在 Supabase 给该用户 `profiles.balance_images` 充值，或开内测 |
| 「用户资料不存在」 | 确认该用户已注册且触发器已创建 `profiles` 行 |
| 「创建任务失败」/ 上游非 JSON | Host 或路径与文档不一致；或密钥无效 |
| 生成成功但保存记录失败 | 检查迁移是否含 `credits_charged`；看返回/服务端日志中的 Postgres 提示 |
| 参考图不生效 | 须先走本站上传拿到签名 URL；`referenceImageUrls` 须通过服务端校验 |

---

## 12. 相关代码路径（便于对照）

| 模块 | 路径 |
|------|------|
| 上游轮询 | `lib/upstream/image-generation.ts` |
| 生图主流程 | `lib/run-generate-image.ts` |
| 生图 API | `app/api/image/generate/route.ts` |
| 页面 Server Action | `app/(site)/generate/actions.ts` |
| 前端页 | `app/(site)/generate/generate-client.tsx` |
| 模型与积分 | `lib/models.ts` |

---

*文档随仓库演进；若与 `README.md` 冲突，以较新提交为准。*
