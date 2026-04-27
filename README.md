# nano-banana-pro

轻量 **AI 图片生成中转台**：用户登录后在 **`/generate` 选择模型** 并提交提示词，服务端调用上游绘图能力，将结果写入 **Supabase**；**每次成功仍扣 `balance_images` 1 次**；次数不足需运营人工充值。不接 Stripe，不做复杂分销后台。（`price_cny` 仍可按模型写入库备查，当前前端不展示价格。）

**完整合并文档（单文件 Markdown）**：[`docs/COMPLETE_GUIDE.md`](./docs/COMPLETE_GUIDE.md)

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16（App Router） |
| 语言 | TypeScript |
| 样式 | Tailwind CSS 4 |
| 认证与数据库 | Supabase（Auth + Postgres + RLS） |
| 部署 | Vercel（推荐）或自有 Linux（见下文 **部署到 VPS**） |
| 架构演进（计划） | [Vercel 前端 + DMIT API + Supabase](./docs/ARCHITECTURE_PLAN_VERCEL_DMIT.md) |

---

## 功能一览

- 邮箱 **注册 / 登录**（Supabase Auth）
- **`/generate`**：多模型卡片单选、可选测试备注、**提示词 + 可选参考图（同一栏）** → Server Action 调上游；**价格与模型 id 以服务端 `lib/models.ts` 为准**；默认成功扣 `balance_images` 1 次（失败不扣）；**内测**见 `GENERATION_TESTING_MODE`，开启后不扣次
- **`/dashboard`**：剩余次数、生成记录（展示名 / 模型 id / 状态 / 图 / 可编辑测试备注）、充值记录
- **`/`**：产品介绍与入口
- 上游 **API Key、完整接口 URL** 仅通过 **环境变量** 注入服务端，不在前端暴露

---

## 视觉规范

见仓库根目录 **[`STYLE.md`](./STYLE.md)**（Nano Banana 系深色 + 香蕉橙 + 首屏 CTA + 图廊与 Supabase 精选字段说明）。

---

## 仓库结构（要点）

```text
STYLE.md                   # 样式与交互规范（设计 Token）
app/
  page.tsx                 # 首页
  layout.tsx               # 根布局 + 顶栏
  login/                   # 登录
  signup/                  # 注册
  generate/
    page.tsx               # 生成页（服务端鉴权 + maxDuration）
    generate-client.tsx    # 表单与结果展示（客户端）
    actions.ts             # Server Action：submitGenerateImage
  dashboard/
    page.tsx               # 记录与余额
    actions.ts             # 更新 test_note
components/
  SiteHeader.tsx
  LogoutButton.tsx
  dashboard/TestNoteCell.tsx
lib/
  models.ts                # 模型 id 白名单与可选画质档位（allowedImageSizes）
  api/prompt/route.ts      # POST 提示词校验
  api/image/generate/route.ts  # POST 生图 + 写库
  api/image/signed/route.ts    # GET 刷新 48h 签名
  run-generate-image.ts    # 生成主流程（鉴权、写库、可选扣次、Storage）
  generation-draw-params.ts   # 画质 / 宽高比白名单与解析
  generation-testing-mode.ts  # 内测开关（读 GENERATION_TESTING_MODE）
  prompt/validate.ts       # 提示词校验（与 /api/prompt 共用）
  storage/                 # Storage 桶名、上传与签名
  dashboard/resolve-job-image-url.ts
  upstream/image-generation.ts  # 上游：创建任务 + 轮询结果
  supabase/                # client / server / admin / middleware
middleware.ts              # 刷新 Supabase 会话
supabase/
  config.toml              # 本地 CLI 端口等
  migrations/*.sql         # 数据库结构
```

---

## 环境变量

复制 `.env.example` 为 `.env.local`（本地）或在 **Vercel → Settings → Environment Variables** 中配置。

### Supabase（应用必配）

| 变量 | 可见性 | 说明 |
|------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 浏览器可访问 | 项目 HTTPS URL（API 默认 **443**） |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 浏览器可访问 | `anon` 公钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | **仅服务端** | `service_role`，用于扣次、写任务、Storage 上传等；**禁止**加 `NEXT_PUBLIC_` |
| `SUPABASE_GENERATION_BUCKET` | 仅服务端（可选） | 存生成图的桶名，默认 `generations` |
| `GENERATION_TESTING_MODE` | 仅服务端（可选） | 设为 `1` / `true` / `yes` 时：**不校验、不扣** `balance_images`，仍写 `image_jobs` 与 Storage；顶栏与创作页显示内测文案。正式上线前关闭 |

### Supabase 直连 Postgres（可选）

用于 Prisma / psql / 数据分析等，**本仓库业务代码不依赖** `DATABASE_URL`。

| 场景 | 典型端口 |
|------|-----------|
| HTTPS API（JS 客户端） | **443**（一般省略） |
| 直连 Session / Direct | **5432** |
| Transaction pooler | **6543** |
| 本地 `supabase start` 的 Postgres | 见 `supabase/config.toml` → `[db] port`（默认 **54322**） |

### 上游绘图（服务端必配）

| 变量 | 说明 |
|------|------|
| `UPSTREAM_API_KEY` | Bearer Token |

模型 id 在 **`lib/models.ts`** 的 `IMAGE_MODELS` 中维护，**不再使用** `UPSTREAM_MODEL` 环境变量。

**推荐**：两条完整 HTTPS 地址（在 Vercel 填写，勿提交密钥到公开仓库）：

| 变量 | 说明 |
|------|------|
| `UPSTREAM_DRAW_URL` | 创建绘图任务的 **完整** POST URL |
| `UPSTREAM_RESULT_URL` | 轮询任务结果的 **完整** POST URL |

**或**拆成 Host + 路径（三者同时存在时由代码拼接）：

- `UPSTREAM_BASE_URL`
- `UPSTREAM_DRAW_PATH`
- `UPSTREAM_RESULT_PATH`

可选：

- `UPSTREAM_REFERENCE_URLS`：参考图地址，逗号/换行分隔，或 JSON 字符串数组；写入请求体 **`urls`**；留空则 **`urls: []`**（纯文生图）
- `UPSTREAM_ASPECT_RATIO`（默认 `auto`）
- `UPSTREAM_BANANA_IMAGE_SIZE`（默认 `1K`）
- `UPSTREAM_POLL_INTERVAL_MS`（默认 `2000`）

对接 **Grsai Nano Banana** 时，路径需与文档一致，例如：`POST .../v1/draw/nano-banana` 创建任务，`POST .../v1/draw/result` 轮询，Host 用文档中的国内或海外地址（见 `.env.example` 注释）。

---

## 上游调用逻辑（摘要）

1. 向 `UPSTREAM_DRAW_URL` 发送 JSON（与官方文档字段名对齐）：`model`、`prompt`、`aspectRatio`、`imageSize`（由创作页或 API 传入，服务端白名单校验）、**`urls`**（数组）、`webHook: "-1"`、`shutProgress: false`。
2. 解析返回中的任务 `id`。
3. 循环请求 `UPSTREAM_RESULT_URL`，传入 `{ id }`，直到 `status` 为 `succeeded` / `failed` 或超时（约 120s）。

具体字段以你实际配置的上游文档为准；实现见 `lib/upstream/image-generation.ts`。

---

## HTTP 接口（与站点同源、需登录 Cookie）

| 方法 | 路径 | 作用 |
|------|------|------|
| `POST` | `/api/prompt` | **提示词端口**：仅校验长度与敏感词，不写库、不扣次、不调上游。Body：`{ "prompt": string }`，返回 `{ ok, prompt? \| error? }`。 |
| `POST` | `/api/image/generate` | **生图端口**：与页面内 Server Action 相同逻辑（写 `image_jobs`、扣次、尽量写入 Storage）。Body：`{ "prompt", "modelId", "testNote?", "aspectRatio?", "imageSize?", "referenceImageUrls?" }`；`referenceImageUrls` 可选；**有参考图时**提示词至少 5 字，否则至少 1 字；参考图 URL 须为当前用户签名链（服务端校验）。宽高比、画质见 `lib/generation-draw-params.ts`。 |
| `GET` | `/api/image/signed?jobId=<uuid>` | 为本人任务重新签发图片 URL：若存在 `storage_path` 则返回 **48h** 签名地址；否则返回已存的 `image_url`。 |

网页 `/generate` 仍默认走 **Server Action**，不强制改用上述 REST。

---

## 图片落库与 48 小时有效链接

1. 生成成功后，服务端从上游临时 URL **下载**图片，上传到 Supabase Storage 私有桶（默认名 **`generations`**，可用 `SUPABASE_GENERATION_BUCKET` 覆盖）。  
2. `image_jobs.storage_path` 记录对象路径；`image_jobs.image_url` 写入当时签发的 **48 小时**有效签名 URL（见 `lib/storage/generation-bucket.ts` 中 `STORAGE_IMAGE_TTL_SECONDS`）。  
3. 若上传失败（未建桶、权限等），会**回落**为上游直链写入 `image_url`（上游链接通常更短时效，以服务商为准）。  
4. **仪表盘**每次加载会为有 `storage_path` 的记录**重新签发**新的 48h 链接，便于长期回看。  
5. 请在 **Supabase Dashboard → Storage** 创建私有桶 `generations`，并执行迁移 `20260428100000_job_image_storage.sql` 增加 `storage_path` 列。

---

## Supabase 数据库

### 初始化

1. 在 Supabase 控制台 **SQL Editor** 依次执行 `supabase/migrations/` 下 SQL（含 `20260426140000_init.sql`、`20260427120000_image_jobs_model_label.sql`、`20260428100000_job_image_storage.sql`、`20260428120000_image_jobs_showcase.sql`、`20260428140000_image_jobs_aspect_size.sql`），或  
2. 本地安装 CLI 后：`supabase link` → `npm run db:push`。

### 表说明

**`profiles`**（与 `auth.users` 1:1）

| 字段 | 说明 |
|------|------|
| `id` | 用户 UUID |
| `email` | 邮箱 |
| `display_name` | 昵称 |
| `balance_images` | 剩余可生成张数 |
| `created_at` | 创建时间 |

注册后由触发器自动插入，`balance_images` 默认 `0`；客户端无法私自改余额（见库内触发器 + RLS）。

**`image_jobs`**

| 字段 | 说明 |
|------|------|
| `id` | 任务 UUID |
| `user_id` | 用户 |
| `prompt` | 提示词 |
| `model` | 上游真实模型 id |
| `model_label` | 前端展示名（如 Nana Pro） |
| `status` | `pending` / `succeeded` / `failed` |
| `image_url` | 结果图访问地址（优先为 Storage 签名 URL，约 48h） |
| `storage_path` | Storage 内路径（存在则仪表盘可反复签发 48h 链接） |
| `upstream_request_id` | 上游任务 id（可空） |
| `price_cny` | 对用户计价（按 `lib/models.ts`） |
| `cost_cny` | 成本（可空） |
| `error_message` | 失败信息 |
| `test_note` | 测试反馈备注（生成页可选填；仪表盘可改） |
| `aspect_ratio` | 生成时选择的宽高比（如 `auto`、`16:9`） |
| `image_size` | 生成时选择的画质（`1K` / `2K` / `4K`） |
| `is_showcase` | 是否作为首页图廊精选（由运营 / 后台更新） |
| `created_at` | 创建时间 |

**`recharge_records`**（人工充值流水）

| 字段 | 说明 |
|------|------|
| `user_id` | 用户 |
| `amount_cny` | 收款金额 |
| `images_added` | 增加张数 |
| `payment_method` | 如微信 / 支付宝 |
| `note` | 备注 |

### 人工充值示例（在 SQL Editor 执行）

将 `<user-uuid>` 换成真实 `profiles.id`：

```sql
insert into public.recharge_records (user_id, amount_cny, images_added, payment_method, note)
values ('<user-uuid>', 6.00, 10, 'wechat', '人工充值');

update public.profiles
set balance_images = balance_images + 10
where id = '<user-uuid>';
```

### Auth 设置建议

- 若注册后无法登录，检查 Supabase **Authentication** 是否开启邮箱确认；开发阶段可关闭「Confirm email」以便快速联调。

---

## 前端页面说明

| 路径 | 说明 |
|------|------|
| `/` | 产品介绍；未登录显示注册/登录；已登录显示次数或「内测 · 不限」（取决于 `GENERATION_TESTING_MODE`） |
| `/login`、`/signup` | 邮箱 + 密码 |
| `/generate` | **未登录也可浏览**双栏与示例预览；登录后生成。左栏模型 / 画质(1K–4K) / 宽高比 / **提示词与参考图** / 备注；右栏结果；`/login?next=/generate` 登录后回到本页 |
| `/dashboard` | 需登录；余额或内测说明、账号信息、生成记录表（含 `model_label` / `model` / `test_note` 编辑）、充值记录表 |

视觉：见 [`STYLE.md`](./STYLE.md)（深色 `#0F0E0C`、主色 `#FF9D3C`）。

---

## 业务规则（生成）

- 默认仅 **登录用户** 可生成。若同时开启 **`GENERATION_TESTING_MODE=1`** 与 **`ANONYMOUS_GENERATE_AS_USER_ID=<uuid>`**（该 UUID 须在 Supabase 已注册且存在 `profiles`），则 **/generate** 与 **POST /api/image/generate** 允许未登录生成，任务记在池用户名下；**测完务必关闭两项并重新部署**，否则公网可被刷量。
- 未开启 `GENERATION_TESTING_MODE` 时：`balance_images < 1` 拒绝生成。
- 先插入 `image_jobs` 为 `pending`（写入 `model`、`model_label`、`price_cny`、`test_note`、`aspect_ratio`、`image_size`），再调上游（请求体含 `aspectRatio`、`imageSize`）；**成功**则更新为 `succeeded` 并写入 `image_url`；**失败**则 `failed` 并写 `error_message`，**不扣次**。
- **非内测**且成功时 **`balance_images -= 1`**；**内测模式**（`GENERATION_TESTING_MODE=1`）成功时**不扣次**，`profiles` 与 `auth.users` 仍关联每条 `image_jobs`。
- **`price_cny` 与模型 id 仅由服务端 `getImageModel(modelId)` 决定**（不信任前端传价；界面可不展示）。
- **创作页**：文/图合一；无参考图时提示词至少 1 字，**有参考图**时至少 5 字；参考图最多 10 张。

---

## NPM 脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 本地开发 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产构建产物 |
| `npm run lint` | ESLint |
| `npm run db:start` | 本地启动 Supabase 栈 |
| `npm run db:stop` | 停止本地栈 |
| `npm run db:push` | 将 migrations 推送到已 link 的远程项目 |
| `npm run db:reset` | 本地重置数据库 |
| `npm run db:types` | 生成 TypeScript 类型到 `lib/database.types.ts`（需先 `supabase link`） |

---

## 本地开发

```bash
cp .env.example .env.local
# 编辑 .env.local，填入 Supabase 与上游变量
# 前期仅测功能、不扣次数时增加一行：GENERATION_TESTING_MODE=1
# 批量免登录测生成时再加（须与上一行同时）：在 Supabase 注册测试号，UUID 填入 ANONYMOUS_GENERATE_AS_USER_ID=

npm install
npm run dev
```

浏览器打开终端提示的地址（一般为 `http://localhost:3000`）。

### Cursor：Agent 结束后自动 git 提交并推送

仓库内已配置 **`.cursor/hooks.json`**：在 **Agent 本轮正常结束**（`stop` 且 `status` 为 `completed`）后，若工作区有变更，会运行 **`.cursor/hooks/auto-git-sync.sh`**（`git add -A` → `commit` → `push` 到 **`origin`** 当前分支）。

本机需已配置：`git config user.name` / `user.email`、`git remote add origin …`，且 **push 无需人工输入密码**（SSH 密钥或 credential helper）。若不需要此行为：在 Cursor **Settings → Hooks** 关闭，或从 `hooks.json` 中移除 `stop` 段。

---

## 部署到 Vercel

1. 将仓库连接 Vercel，Framework Preset 选 **Next.js**。  
2. 在 Vercel **Settings → Environment Variables** 填入上述 **全部必配环境变量**（含 `SUPABASE_SERVICE_ROLE_KEY` 与上游变量），并确认对 **Production** 勾选生效（仅填在 Development 时线上拿不到变量）。保存后 **Redeploy** 一次。  
3. 在 **Supabase Dashboard → Authentication → URL Configuration**：把 **Site URL** 设为生产地址（如 `https://你的项目.vercel.app`）。**Redirect URLs** 中须包含站点根与邮箱验证回调，例如：`https://你的域名/**`、`https://你的域名/auth/callback`（与代码中 `app/auth/callback/route.ts` 一致），否则登录无会话、邮箱验证后无法回站。  
4. 部署完成后，在 Supabase 中为生产环境执行迁移（若尚未执行）。  

**别人打不开 / 只能本机打开**

- **Deployment Protection**：Vercel 项目 → **Settings → Deployment Protection**。若开启「仅团队成员 / Vercel 登录可访问」，未登录 Vercel 的浏览器会进不了预览或生产地址；需要对外公开时，请按团队策略关闭对外的保护或为访客配置允许规则。  
- **环境变量未进 Production**：他机访问的是线上构建，若 `NEXT_PUBLIC_SUPABASE_*` 等未勾选 Production，页面可能异常或顶栏长期提示未配置；见上一步。  
- **网络与地区（手机常见）**：若系统诊断显示「浏览器 / 网络正常，但网站连不上」（到 `*.vercel.app` 一段红叉），多半是 **当前运营商或地区对 Vercel 默认子域访问不稳定或被干扰**，与仓库代码、Vercel 控制台「是否部署成功」可以并存。处理思路：**绑定自定义域名**（域名 DNS 指到 Vercel 后，用 `https://你的域名` 访问）；或换 Wi‑Fi / 其他运营商试；请境外网络的朋友打开同一 `*.vercel.app` 链接，若境外可开、境内不可开，即可确认是链路问题而非应用未发布。

**超时**：生成页路由配置了 `maxDuration = 120`（秒）；Vercel 不同套餐对 Serverless 上限不同，若经常超时需升级套餐或改为异步任务架构。

---

## 部署到自有 VPS（Linux）

仓库已开启 **`output: "standalone"`**（`next.config.ts`），适合在单台机器上用 **Node 直接跑**，无需整份 `node_modules` 上机。

### 机器与资源（以 1 vCPU / 1 GB RAM / 20 GB 盘为例）

- **内存**：在本机执行 `npm run build` 时 Next 编译较吃内存，**1 GB 容易 OOM**。建议二选一：  
  - **加 Swap**（例如 2 GB）后再构建；或  
  - 在 **本机 / CI（GitHub Actions）** 上 `npm ci && npm run build`，只把产物 **`/.next/standalone`**、**`/.next/static`**、**`/public`** 同步到 VPS（见下「最小目录」）。  
- **磁盘**：镜像与长期文件主要在 **Supabase Storage**，VPS 20 GB 一般够用；留意系统日志与 `journal` 体积。  
- **网络**：建议绑定 **域名** 并上 HTTPS（Let’s Encrypt）；Supabase 的 **Site URL / Redirect URLs** 填 `https://你的域名` 与 `https://你的域名/auth/callback`（勿写裸 IP，证书与 Auth 回调都麻烦）。

### 在 VPS 上运行（构建已在机器上完成时）

1. 安装 **Node.js 20 LTS**（或 22），开放防火墙 **80 / 443**（及 SSH **22**）。  
2. 将环境变量写入 **`/etc/nano-banana.env`**（或其它路径），权限收紧，内容与 `.env.example` 一致（含 `NEXT_PUBLIC_*`、`SUPABASE_SERVICE_ROLE_KEY`、上游等）。  
3. 部署目录中除 **`standalone` 入口** 外，需复制 Next 文档要求的两项（相对仓库根）：  
   - `cp -r public .next/standalone/`  
   - `mkdir -p .next/standalone/.next && cp -r .next/static .next/standalone/.next/`  
4. 进程示例：`cd .next/standalone && HOSTNAME=0.0.0.0 PORT=3000 node server.js`（生产请用 **systemd** 或 **pm2** 保活、开机自启）。  
5. 前面反代 **Caddy** 或 **Nginx**：对外 443 → `127.0.0.1:3000`，自动 TLS；不要把 `3000` 直接暴露公网若可避免。

### 与 Vercel 的差异

- **无** Vercel 的 Serverless 时间上限；生成长任务仍受上游与单进程稳定性影响。  
- **HTTPS、备份、监控、系统更新** 由你自行维护。

---

## 安全与合规

- **切勿**将 `SUPABASE_SERVICE_ROLE_KEY`、`UPSTREAM_API_KEY` 设为 `NEXT_PUBLIC_*`。  
- 提示词有基础敏感词拦截（`lib/sensitive.ts`），仍需在页面展示使用条款并自行把控内容合规。  
- 上游返回的图片 URL 若有时效，长期留存需自行转存（如 Supabase Storage），当前表内仅存 URL 字符串。

---

## 常见问题

**Q：注册后没有 profile？**  
A：确认迁移已执行且触发器 `on_auth_user_created` 存在；查看 Supabase 日志与 `auth.users` / `profiles`。

**Q：生成报「服务未配置…」**  
A：检查是否缺少 `UPSTREAM_DRAW_URL` + `UPSTREAM_RESULT_URL`（或 BASE + 两条 PATH）以及 `UPSTREAM_API_KEY`；**轮询 URL 是否与文档一致**（Grsai 一般为 `.../v1/draw/result`）；`model` 是否与上游文档一致（改 `lib/models.ts`）。

**Q：Middleware 构建警告？**  
A：Next.js 16 可能对 `middleware` 文件有新的命名提示，不影响当前 `middleware.ts` 刷新会话的常见用法；后续可按官方文档迁移。

**Q：Vercel 部署后别的电脑打不开？**  
A：先区分两类现象：（1）**403 / 要登录 Vercel** → 多为 **Deployment Protection** 或环境变量未进 **Production**；Supabase **Redirect URLs** 未含生产域名会导致登录异常。（2）**手机自带诊断：网络正常、网站红叉** → 多为 **`*.vercel.app` 在本地网络下不可达**，请绑 **自定义域名** 或换网络验证。详见上文「别人打不开」。

---

## 许可证

私有项目；如需开源请自行补充 `LICENSE`。
