# Grsai Sora2 视频接口（留档）

> 备注：本文件用于项目内留档，便于后续接入。当前项目主链路仍是图片生成。

## 节点信息

- Host（海外）：`https://grsaiapi.com`
- Host（国内直连）：`https://grsai.dakka.com.cn`
- 组合方式：`{HOST}+{PATH}`
- 示例：`https://grsai.dakka.com.cn/v1/video/sora-video`

---

## 1) Sora2 视频生成

- Method: `POST`
- Path: `/v1/video/sora-video`
- Headers:

```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer apikey"
}
```

### 请求体

```json
{
  "model": "sora-2",
  "prompt": "提示词",
  "url": "https://example.com/example.png",
  "aspectRatio": "16:9",
  "duration": 10,
  "remixTargetId": "",
  "size": "small",
  "webHook": "https://example.com/callback",
  "shutProgress": false
}
```

### 参数说明

- `model`（必填，string）：目前文档给出 `sora-2`
- `prompt`（必填，string）：提示词
- `url`（可选，string）：参考图 URL 或 Base64
- `aspectRatio`（可选，string）：`9:16` / `16:9`，默认 `9:16`
- `duration`（可选，number）：`10` / `15`（秒），默认 `10`
- `remixTargetId`（可选，string）：续作目标 id（参考结果里的 `pid`）
- `size`（可选，string）：`small` / `large`，默认 `small`
- `webHook`（可选，string）：
  - 默认是 stream 返回
  - 如需轮询结果，传 `"-1"`，接口会立即返回任务 `id`
- `shutProgress`（可选，boolean）：是否关闭进度回复，默认 `false`

### webHook = "-1" 立即返回（任务创建结果）

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "id": "f44bcf50-f2d0-4c26-a467-26f2014a771b"
  }
}
```

### 结果数据（stream / 回调 / 查询结果里的 data）

```json
{
  "id": "xxxxx",
  "results": [
    {
      "url": "https://example.com/example.mp4",
      "removeWatermark": true,
      "pid": "s_xxxxxxxxxxxxxxx"
    }
  ],
  "progress": 100,
  "status": "succeeded",
  "failure_reason": "",
  "error": ""
}
```

- `results[].url`：视频 URL（文档说明有效期约 2 小时）
- `results[].removeWatermark`：是否去水印
- `results[].pid`：续作可用 id（`remixTargetId`）
- `status`：`running` / `succeeded` / `failed`
- `failure_reason`：`output_moderation` / `input_moderation` / `error`

---

## 2) 上传角色接口

- Method: `POST`
- Path: `/v1/video/sora-upload-character`
- Headers 同上

### 请求体

```json
{
  "url": "https://example.com/example.mp4",
  "timestamps": "0,3"
}
```

### 参数说明

- `url`（可选，string）：角色视频 URL 或 Base64
- `timestamps`（可选，string）：`开始秒数,结束秒数`，最多 3 秒（示例 `0,3`）
- `webHook` / `shutProgress` 语义同视频生成接口

### 结果数据

```json
{
  "id": "xxxxx",
  "results": [
    {
      "character_id": "character.name"
    }
  ],
  "progress": 100,
  "status": "succeeded",
  "failure_reason": "",
  "error": ""
}
```

- `results[].character_id`：角色 id；提示词里可通过 `@character_id` 使用

---

## 3) 从原视频创建角色

- Method: `POST`
- Path: `/v1/video/sora-create-character`
- Headers 同上

### 请求体

```json
{
  "pid": "s_xxxxxxxxxxxxxxx",
  "timestamps": "0,3"
}
```

### 参数说明

- `pid`（必填，string）：原视频 id（来自生成结果 `pid`）
- `timestamps`（文档示例有给出；语义同上传角色）
- `webHook` / `shutProgress` 同上

### 结果数据

与上传角色接口一致，核心字段为 `results[].character_id`。

---

## 4) 轮询结果接口

- Method: `POST`
- Path: `/v1/draw/result`（文档给出的结果查询路径）

### 请求体

```json
{
  "id": "xxxxx"
}
```

### 响应

```json
{
  "code": 0,
  "data": {
    "id": "xxxxx",
    "results": [
      {
        "url": "https://example.com/example.mp4",
        "removeWatermark": true,
        "pid": "s_xxxxxxxxxxxxxxx"
      }
    ],
    "progress": 100,
    "status": "succeeded",
    "failure_reason": "",
    "error": ""
  },
  "msg": "success"
}
```

- `code = 0`：成功
- `code = -22`：任务不存在

---

## 5) 接入注意事项（给项目实现时用）

- 当前图片链路也用 `webHook: "-1"` + `/v1/draw/result` 轮询；视频可复用同一轮询模式。
- 视频直链有效期短（约 2 小时），后续若上线应考虑落到自有存储再发签名。
- 文档提到失败返积分；项目侧仍建议按“成功后扣积分”实现，避免双边状态不一致。
