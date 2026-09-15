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

function formatEmailProgressLabel(progress: EmailSendProgress): string {
  const attempted = progress.sent + progress.failed;
  if (progress.total <= 0) {
    return "Sending…";
  }
  const noun = progress.total === 1 ? "email" : "emails";
  return `${attempted} ${noun} sent out of ${progress.total}`;
}

export function emailProgressDescription(progress: EmailSendProgress | null): string {
  if (!progress || progress.total <= 0) {
    return "Please wait while we deliver this message.";
  }
  return "Emails are sent one at a time — this may take a moment.";
}

export { formatEmailProgressLabel };

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
