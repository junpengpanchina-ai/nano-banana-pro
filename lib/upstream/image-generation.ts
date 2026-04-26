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

  const base = process.env.UPSTREAM_BASE_URL?.replace(/\/+$/, "");
  const drawPath = process.env.UPSTREAM_DRAW_PATH?.trim();
  const resultPath = process.env.UPSTREAM_RESULT_PATH?.trim();
  if (base && drawPath && resultPath) {
    const d = drawPath.startsWith("/") ? drawPath : `/${drawPath}`;
    const r = resultPath.startsWith("/") ? resultPath : `/${resultPath}`;
    return { drawUrl: `${base}${d}`, resultUrl: `${base}${r}` };
  }

  return {
    error:
      "请在部署环境配置 UPSTREAM_DRAW_URL 与 UPSTREAM_RESULT_URL（完整 HTTPS 地址），或同时配置 UPSTREAM_BASE_URL、UPSTREAM_DRAW_PATH、UPSTREAM_RESULT_PATH。",
  };
}

/**
 * 轮询式出图：创建任务（webHook 为立即返回 id）→ 轮询结果。
 * 所有 URL 与密钥仅从环境变量读取，仓库内不写死任何第三方 Host 或路径。
 */
export async function requestUpstreamImage(
  prompt: string,
  /** 上游 JSON 里的 model，由服务端校验后的 id */
  modelId: string,
): Promise<UpstreamImageResult> {
  const apiKey = process.env.UPSTREAM_API_KEY;
  const aspectRatio = process.env.UPSTREAM_ASPECT_RATIO ?? "auto";
  const imageSize = process.env.UPSTREAM_BANANA_IMAGE_SIZE ?? "1K";

  const urls = resolveDrawAndResultUrls();
  if ("error" in urls) {
    return { ok: false, error: urls.error };
  }
  const { drawUrl, resultUrl } = urls;

  if (!apiKey || !modelId.trim()) {
    return { ok: false, error: "服务未配置上游密钥或未指定模型" };
  }

  const deadline = Date.now() + 120_000;
  const pollIntervalMs = Number(process.env.UPSTREAM_POLL_INTERVAL_MS ?? "2000") || 2000;
  const referenceUrls = getUpstreamReferenceUrls();

  const controller = new AbortController();

  try {
    const createRes = await fetch(drawUrl, {
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
        urls: referenceUrls,
        webHook: "-1",
        shutProgress: false,
      }),
      signal: controller.signal,
    });

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
        error: msg || `创建任务失败（code: ${String(createJson.code)}）`,
      };
    }

    const taskId = createJson.data.id;

    while (Date.now() < deadline) {
      const pollRes = await fetch(resultUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: taskId }),
        signal: controller.signal,
      });

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
          error: parts.length ? parts.join(": ") : "生成失败",
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
      error: "等待结果超时，请稍后重试",
      upstreamRequestId: taskId,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "上游请求异常";
    if (message.includes("abort")) {
      return { ok: false, error: "上游请求中断" };
    }
    return { ok: false, error: message };
  }
}
