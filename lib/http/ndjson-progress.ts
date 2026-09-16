/**
 * NDJSON streaming helpers for long-running POST handlers (e.g. email fan-out).
 * Client requests with `Accept: application/x-ndjson` get progress lines then a final `done`.
 */

import { AppError, DomainError } from "@/lib/errors/app-error";

export type NdjsonProgressEvent =
  | { type: "progress"; sent: number; failed: number; total: number }
  | { type: "done"; data: unknown }
  | { type: "error"; error: string; status?: number };

export function wantsNdjsonProgress(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/x-ndjson");
}

export function ndjsonProgressResponse(
  run: (
    emitProgress: (progress: {
      sent: number;
      failed: number;
      total: number;
    }) => void | Promise<void>,
  ) => Promise<unknown>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = async (event: NdjsonProgressEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        // Yield so the runtime can flush each progress line to the client.
        await new Promise<void>((resolve) => setImmediate(resolve));
      };

      try {
        const data = await run(async (progress) => {
          await write({ type: "progress", ...progress });
        });
        await write({ type: "done", data });
      } catch (error) {
        const message =
          error instanceof DomainError || error instanceof AppError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Request failed";
        const status =
          error instanceof DomainError || error instanceof AppError
            ? error.status
            : 500;
        await write({ type: "error", error: message, status });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
