/**
 * Client-side formatting for the standard API error envelope.
 * Display: ERROR {code} — {MESSAGE}
 */

import type { AppErrorPayload } from "@/lib/errors/app-error";
import {
  ERROR_CATALOG,
  isErrorKey,
  resolveErrorKeyFromMessage,
} from "@/lib/errors/catalog";

export function formatErrorDisplay(code: number, message: string): string {
  return `ERROR ${code} — ${message}`;
}

export function formatAppErrorPayload(payload: AppErrorPayload): string {
  return formatErrorDisplay(payload.code, payload.message);
}

/**
 * Accepts typical `await response.json()` bodies:
 * - `{ error: { code, key, message } }` (new)
 * - `{ error: "legacy string" }` (old)
 * - a bare string
 * - an Error instance
 */
export function formatAppError(
  input: unknown,
  fallbackMessage?: string,
): string {
  if (input == null) {
    const def = ERROR_CATALOG.SYSTEM_ERROR;
    return formatErrorDisplay(
      def.code,
      fallbackMessage?.toUpperCase() ?? def.message,
    );
  }

  if (typeof input === "string") {
    const key = isErrorKey(input) ? input : resolveErrorKeyFromMessage(input);
    if (key) {
      const def = ERROR_CATALOG[key];
      return formatErrorDisplay(def.code, def.message);
    }
    return formatErrorDisplay(
      ERROR_CATALOG.UNMAPPED_ERROR.code,
      input.trim().toUpperCase() || ERROR_CATALOG.UNMAPPED_ERROR.message,
    );
  }

  if (input instanceof Error) {
    return formatAppError(input.message, fallbackMessage);
  }

  if (typeof input === "object") {
    const body = input as {
      error?: unknown;
      code?: unknown;
      key?: unknown;
      message?: unknown;
    };

    const nested = body.error;
    if (nested && typeof nested === "object") {
      const payload = nested as Partial<AppErrorPayload>;
      if (
        typeof payload.code === "number" &&
        typeof payload.message === "string"
      ) {
        return formatErrorDisplay(payload.code, payload.message);
      }
      if (typeof payload.key === "string" && isErrorKey(payload.key)) {
        const def = ERROR_CATALOG[payload.key];
        return formatErrorDisplay(def.code, def.message);
      }
    }

    if (typeof nested === "string") {
      return formatAppError(nested, fallbackMessage);
    }

    if (typeof body.code === "number" && typeof body.message === "string") {
      return formatErrorDisplay(body.code, body.message);
    }
  }

  const def = ERROR_CATALOG.SYSTEM_ERROR;
  return formatErrorDisplay(
    def.code,
    fallbackMessage?.toUpperCase() ?? def.message,
  );
}
