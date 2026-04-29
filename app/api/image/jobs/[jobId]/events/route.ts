import { createClient } from "@/lib/supabase/server";
import { getAnonymousGeneratePoolUserId } from "@/lib/anonymous-generate-mode";

export const maxDuration = 130;
export const dynamic = "force-dynamic";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function sseEncode(data: unknown): Uint8Array {
  const line = `data: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(line);
}

/**
 * SSE：轮询 `image_jobs` 直至 succeeded / failed 或超时。用于创作页流式反馈；关闭连接不取消后台任务。
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  const { jobId } = await context.params;
  if (!jobId || typeof jobId !== "string") {
    return new Response("Bad Request", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const poolId = getAnonymousGeneratePoolUserId();

  if (!user && !poolId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: jobPeek, error: peekErr } = await supabase
    .from("image_jobs")
    .select("user_id, status")
    .eq("id", jobId)
    .maybeSingle();

  if (peekErr || !jobPeek) {
    return new Response("Not Found", { status: 404 });
  }

  const ownerId = jobPeek.user_id as string;
  if (user) {
    if (ownerId !== user.id) {
      return new Response("Forbidden", { status: 403 });
    }
  } else if (!poolId || ownerId !== poolId) {
    return new Response("Forbidden", { status: 403 });
  }

  const balanceUserId = ownerId;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const deadline = Date.now() + 125_000;
      let pulses = 0;

      try {
        controller.enqueue(
          sseEncode({ type: "subscribed", jobId, message: "已订阅任务状态" }),
        );

        while (Date.now() < deadline) {
          const { data: row, error } = await supabase
            .from("image_jobs")
            .select("status, image_url, error_message, price_cny")
            .eq("id", jobId)
            .maybeSingle();

          if (error || !row) {
            controller.enqueue(sseEncode({ type: "terminal", ok: false, error: "任务不存在或无法读取" }));
            break;
          }

          const st = row.status as string;
          if (st === "succeeded") {
            const { data: profile } = await supabase
              .from("profiles")
              .select("balance_images")
              .eq("id", balanceUserId)
              .maybeSingle();
            controller.enqueue(
              sseEncode({
                type: "terminal",
                ok: true,
                status: "succeeded",
                imageUrl: row.image_url as string,
                balanceImages: profile?.balance_images ?? 0,
                priceCny: Number(row.price_cny ?? 0),
              }),
            );
            break;
          }

          if (st === "failed") {
            controller.enqueue(
              sseEncode({
                type: "terminal",
                ok: false,
                status: "failed",
                error: (row.error_message as string) || "生成失败",
              }),
            );
            break;
          }

          pulses += 1;
          controller.enqueue(sseEncode({ type: "pulse", status: "pending", n: pulses }));
          await sleep(1500);
        }

        if (Date.now() >= deadline) {
          controller.enqueue(
            sseEncode({
              type: "terminal",
              ok: false,
              error: "等待结果超时，请稍后在「我的记录」中查看任务是否已完成。",
            }),
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "流中断";
        controller.enqueue(sseEncode({ type: "terminal", ok: false, error: msg }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
