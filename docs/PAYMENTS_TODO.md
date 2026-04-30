# 支付接入占位（微信 / Stripe）

> 目标：后续让用户自助充值积分（`profiles.balance_images`），当前仅留空占位，不启用真实支付。

---

## 1. 余额与入账原则（现状不变）

- **余额真相源**：`public.profiles.balance_images`
- **充值流水**：`public.recharge_records`
- **入账方式**：支付成功回调 → 服务端校验与幂等 → 写 `recharge_records` → `profiles.balance_images += images_added`

> 备注：务必保证 **幂等**（同一订单号只入账一次），且只允许服务端（`service_role`）修改余额。

---

## 2. 微信支付（WeChat Pay）环境变量（占位）

见 `.env.example`：

- `WECHAT_PAY_MCH_ID`
- `WECHAT_PAY_APP_ID`
- `WECHAT_PAY_API_V3_KEY`
- `WECHAT_PAY_SERIAL_NO`
- `WECHAT_PAY_PRIVATE_KEY_PEM`
- `WECHAT_PAY_NOTIFY_URL`

---

## 3. Stripe 环境变量（占位）

见 `.env.example`：

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_SUCCESS_URL`
- `STRIPE_CANCEL_URL`
- （可选）`STRIPE_PRICE_ID_*`：按套餐映射到积分数

---

## 4. 计划中的最小接口（后续实现）

> 仅列结构，暂不实现代码。

- `POST /api/payments/create`：创建订单（返回支付链接/二维码参数）
- `POST /api/payments/webhook/wechat`：微信支付回调
- `POST /api/payments/webhook/stripe`：Stripe webhook

---

## 5. 推荐表结构扩展（可选）

若要严格幂等与对账，建议新增 `payment_orders` 表：

- `id`（uuid）
- `user_id`
- `provider`（wechat/stripe）
- `provider_order_id`（微信 out_trade_no / Stripe session/payment_intent）
- `amount_cny` / `amount_usd`
- `credits_added`
- `status`（created/paid/failed/refunded）
- `created_at` / `paid_at`

并在 webhook 中以 `provider_order_id` 做唯一约束与幂等。

