type UpstreamImageResult =
  | { ok: true; imageUrl: string; upstreamRequestId?: string }
  | { ok: false; error: string; upstreamRequestId?: string };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type DrawCreateResponse = {
  code?: number;
  msg?: string;
  data?: { id?: string };
};

type DrawResultPayload = {
  id?: string;
  results?: Array<{ url?: string; content?: string }>;
  progress?: number;
  status?: string;
  failure_reason?: string;
  error?: string;
};

type DrawResultResponse = {
  code?: number;
  msg?: string;
  data?: DrawResultPayload;
};

function parseJsonSafe(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

function looksLikeTimeoutMessage(msg: string): boolean {
  const lower = msg.toLowerCase();
  return lower.includes("timeout") || lower.includes("timed out") || lower.includes("超时");
}

/** 官方文档要求携带 `urls`（参考图）；纯文生图可传空数组，或通过环境变量传入 URL。 */
function getUpstreamReferenceUrls(): string[] {
  const raw = process.env.UPSTREAM_REFERENCE_URLS?.trim();
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
        return (parsed as string[]).map((u) => u.trim()).filter(Boolean);
      }
    } catch {
      return [];
    }
    return [];
  }
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveDrawAndResultUrls(): { drawUrl: string; resultUrl: string } | { error: string } {
  const drawFull = process.env.UPSTREAM_DRAW_URL?.trim();
  const resultFull = process.env.UPSTREAM_RESULT_URL?.trim();
  if (drawFull && resultFull) {
    return { drawUrl: drawFull, resultUrl: resultFull };
  }

  // "Black box" defaults (no need to configure URL envs):
  // Grsai Nano Banana (CN direct). You can still override via env vars above.
  const DEFAULT_BASE = "https://grsai.dakka.com.cn";
  const DEFAULT_DRAW_PATH = "/v1/draw/nano-banana";
  const DEFAULT_RESULT_PATH = "/v1/draw/result";

  const base = (process.env.UPSTREAM_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/+$/, "");
  const drawPath = process.env.UPSTREAM_DRAW_PATH?.trim() || DEFAULT_DRAW_PATH;
  const resultPath = process.env.UPSTREAM_RESULT_PATH?.trim() || DEFAULT_RESULT_PATH;

  const d = drawPath.startsWith("/") ? drawPath : `/${drawPath}`;
  const r = resultPath.startsWith("/") ? resultPath : `/${resultPath}`;
  if (base) {
    return { drawUrl: `${base}${d}`, resultUrl: `${base}${r}` };
  }

  return {
    error:
      "服务未配置上游地址（可选）：你可以设置 UPSTREAM_DRAW_URL/UPSTREAM_RESULT_URL，或 UPSTREAM_BASE_URL/UPSTREAM_DRAW_PATH/UPSTREAM_RESULT_PATH。未设置时将使用内置默认地址。",
  };
}

/**
 * 轮询式出图：创建任务（webHook 为立即返回 id）→ 轮询结果。
 * 所有 URL 与密钥仅从环境变量读取，仓库内不写死任何第三方 Host 或路径。
 */
export type UpstreamDrawBodyParams = {
  aspectRatio: string;
  imageSize: string;
  /** 用户参考图（HTTPS）；与环境变量参考图合并后写入请求体 `urls` */
  referenceUrls?: string[];
};

export async function requestUpstreamImage(
  prompt: string,
  /** 上游 JSON 里的 model，由服务端校验后的 id */
  modelId: string,
  /** 已由服务端白名单校验的宽高比与画质 */
  draw: UpstreamDrawBodyParams,
): Promise<UpstreamImageResult> {
  const apiKey = process.env.UPSTREAM_API_KEY;
  const aspectRatio = draw.aspectRatio || process.env.UPSTREAM_ASPECT_RATIO || "auto";
  const imageSize = draw.imageSize || process.env.UPSTREAM_BANANA_IMAGE_SIZE || "1K";

  const urls = resolveDrawAndResultUrls();
  if ("error" in urls) {
    return { ok: false, error: urls.error };
  }
  const { drawUrl, resultUrl } = urls;

  if (!apiKey || !modelId.trim()) {
    return { ok: false, error: "服务未配置上游密钥或未指定模型" };
  }

  const deadlineMs = Number(process.env.UPSTREAM_DEADLINE_MS ?? "120000") || 120_000;
  const deadline = Date.now() + Math.max(10_000, deadlineMs);
  const pollIntervalMs = Number(process.env.UPSTREAM_POLL_INTERVAL_MS ?? "2000") || 2000;
  const httpTimeoutMs = Number(process.env.UPSTREAM_HTTP_TIMEOUT_MS ?? "30000") || 30_000;
  const userRefs = draw.referenceUrls ?? [];
  const envRefs = getUpstreamReferenceUrls();
  const mergedReferenceUrls = [...userRefs, ...envRefs].slice(0, 10);

  try {
    const createRes = await fetchWithTimeout(
      drawUrl,
      {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        prompt,
        aspectRatio,
        imageSize,
        urls: mergedReferenceUrls,
        webHook: "-1",
        shutProgress: false,
      }),
      },
      httpTimeoutMs,
    );

    const createText = await createRes.text();
    const ct = createRes.headers.get("content-type") ?? "";

    if (!createRes.ok) {
      const fallback = createText.length > 500 ? `${createText.slice(0, 500)}…` : createText;
      return { ok: false, error: fallback || `上游 HTTP ${createRes.status}` };
    }

    if (!ct.includes("application/json") && !createText.trimStart().startsWith("{")) {
      return {
        ok: false,
        error: "上游返回非 JSON，请检查环境变量中的接口地址与文档是否一致。",
      };
    }

    const createJson = parseJsonSafe(createText) as DrawCreateResponse | null;
    if (!createJson || typeof createJson !== "object") {
      return { ok: false, error: "创建任务响应无法解析" };
    }

    if (createJson.code !== 0 || !createJson.data?.id) {
      const msg = [createJson.msg, createJson.data && JSON.stringify(createJson.data)]
        .filter(Boolean)
        .join(" — ");
      return {
        ok: false,
        error: looksLikeTimeoutMessage(msg)
          ? `上游超时/繁忙：${msg}（建议稍后重试，或在部署环境把 UPSTREAM_DEADLINE_MS 调大，例如 180000）`
          : msg || `创建任务失败（code: ${String(createJson.code)}）`,
      };
    }

    const taskId = createJson.data.id;

    while (Date.now() < deadline) {
      const pollRes = await fetchWithTimeout(
        resultUrl,
        {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: taskId }),
        },
        httpTimeoutMs,
      );

      const pollText = await pollRes.text();
      const pollJson = parseJsonSafe(pollText) as DrawResultResponse | null;

      if (!pollRes.ok) {
        return {
          ok: false,
          error: pollText.length > 400 ? `${pollText.slice(0, 400)}…` : pollText || `上游 HTTP ${pollRes.status}`,
          upstreamRequestId: taskId,
        };
      }

      if (!pollJson || typeof pollJson !== "object") {
        return { ok: false, error: "查询结果响应无法解析", upstreamRequestId: taskId };
      }

      if (pollJson.code === -22) {
        return { ok: false, error: "任务不存在", upstreamRequestId: taskId };
      }

      if (pollJson.code !== 0 && pollJson.code !== undefined) {
        return {
          ok: false,
          error: pollJson.msg ?? `查询失败（code: ${String(pollJson.code)}）`,
          upstreamRequestId: taskId,
        };
      }

      const d = pollJson.data;
      const status = d?.status;

      if (status === "succeeded") {
        const url = d?.results?.[0]?.url;
        if (!url) {
          return {
            ok: false,
            error: "成功状态但未返回图片地址",
            upstreamRequestId: taskId,
          };
        }
        return { ok: true, imageUrl: url, upstreamRequestId: taskId };
      }

      if (status === "failed") {
        const reason = d?.failure_reason ?? "";
        const detail = d?.error ?? "";
        const parts = [reason, detail].filter(Boolean);
        return {
          ok: false,
          error: parts.length
            ? (looksLikeTimeoutMessage(parts.join(": "))
                ? `上游超时/繁忙：${parts.join(": ")}（建议稍后重试）`
                : parts.join(": "))
            : "生成失败",
          upstreamRequestId: taskId,
        };
      }

      if (status === "running" || status === undefined || status === "") {
        const remaining = deadline - Date.now();
        if (remaining <= pollIntervalMs) break;
        await sleep(Math.min(pollIntervalMs, remaining));
        continue;
      }

      return {
        ok: false,
        error: `未知任务状态: ${String(status)}`,
        upstreamRequestId: taskId,
      };
    }

    return {
      ok: false,
      error: `等待结果超时（${Math.round(deadlineMs / 1000)}s），请稍后重试；或在部署环境把 UPSTREAM_DEADLINE_MS 调大。`,
      upstreamRequestId: taskId,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "上游请求异常";
    if (message.includes("abort")) {
      return {
        ok: false,
        error: `上游请求超时/中断（可在部署环境设置 UPSTREAM_HTTP_TIMEOUT_MS / UPSTREAM_DEADLINE_MS）`,
      };
    }
    return { ok: false, error: message };
  }
}
