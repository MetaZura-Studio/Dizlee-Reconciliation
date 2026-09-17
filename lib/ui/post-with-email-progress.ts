/**
 * Client helper: POST with Accept: application/x-ndjson and report email send progress.
 */

import { formatAppError } from "@/lib/errors/format";

export type EmailSendProgress = {
  sent: number;
  failed: number;
  total: number;
};

type NdjsonLine =
  | { type: "progress"; sent: number; failed: number; total: number }
  | { type: "done"; data: unknown }
  | { type: "error"; error: string; status?: number };

export function emailAttemptedCount(progress: EmailSendProgress | null): number {
  if (!progress) {
    return 0;
  }
  return progress.sent + progress.failed;
}

export function emailProgressPercent(progress: EmailSendProgress | null): number {
  if (!progress || progress.total <= 0) {
    return 0;
  }
  return Math.min(
    100,
    Math.round((emailAttemptedCount(progress) / progress.total) * 100),
  );
}

/** Brief pause so the “All emails sent” state is visible before the success dialog. */
export function waitForEmailProgressDoneUi(ms = 1100): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function postWithEmailProgress<T = unknown>(params: {
  url: string;
  body: unknown;
  onProgress?: (progress: EmailSendProgress) => void;
  fallbackError?: string;
}): Promise<T> {
  const response = await fetch(params.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
    },
    body: JSON.stringify(params.body),
  });

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/x-ndjson")) {
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(
        formatAppError(
          payload,
          params.fallbackError ?? "Request failed",
        ),
      );
    }
    return (payload?.data ?? payload) as T;
  }

  if (!response.body) {
    throw new Error(params.fallbackError ?? "Request failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneData: T | undefined;
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      let event: NdjsonLine;
      try {
        event = JSON.parse(trimmed) as NdjsonLine;
      } catch {
        continue;
      }
      if (event.type === "progress") {
        params.onProgress?.({
          sent: event.sent,
          failed: event.failed,
          total: event.total,
        });
      } else if (event.type === "done") {
        doneData = event.data as T;
      } else if (event.type === "error") {
        streamError = event.error;
      }
    }
  }

  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer.trim()) as NdjsonLine;
      if (event.type === "done") {
        doneData = event.data as T;
      } else if (event.type === "error") {
        streamError = event.error;
      } else if (event.type === "progress") {
        params.onProgress?.({
          sent: event.sent,
          failed: event.failed,
          total: event.total,
        });
      }
    } catch {
      // ignore trailing garbage
    }
  }

  if (streamError) {
    throw new Error(streamError);
  }
  if (doneData === undefined) {
    throw new Error(params.fallbackError ?? "Request failed");
  }
  return doneData;
}
