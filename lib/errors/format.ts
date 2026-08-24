/**
 * Client-side formatting for API errors.
 * UI shows short plain-language messages. Numeric codes stay on the server
 * (API logs / network payload) for diagnosis — never render "ERROR 101 — …".
 */

import type { AppErrorPayload } from "@/lib/errors/app-error";
import {
  ERROR_CATALOG,
  isErrorKey,
  resolveErrorKeyFromMessage,
  type ErrorKey,
} from "@/lib/errors/catalog";

/** Short messages shown in the UI (no codes). */
const CLIENT_MESSAGES: Partial<Record<ErrorKey, string>> = {
  INVALID_CREDENTIALS: "Login failed. Check your email and password.",
  USER_NOT_FOUND: "Login failed. Check your email and password.",
  USER_NOT_ACTIVE: "This account is not active. Contact your administrator.",
  ACCOUNT_NOT_ACTIVE: "This account is not active. Contact your administrator.",
  PASSWORD_LINK_INVALID: "This password link is invalid.",
  PASSWORD_LINK_EXPIRED: "This password link has expired.",
  CURRENT_PASSWORD_INCORRECT: "Current password is incorrect.",
  PASSWORD_MUST_DIFFER: "New password must be different from the current one.",
  PASSWORD_NOT_SET: "Password has not been set for this account.",
  RATE_LIMITED: "Too many attempts. Please try again later.",
  UNAUTHORIZED: "Please sign in to continue.",
  VALIDATION_FAILED: "Please check your input and try again.",
  INVALID_REQUEST: "Invalid request. Please try again.",
  NOT_FOUND: "The requested item was not found.",
  FILE_REQUIRED: "Please choose a file to upload.",
  FILE_TOO_LARGE: "File is too large.",
  FILE_EMPTY: "The file is empty.",
  INVALID_EXCEL_FILE: "Please upload a valid Excel file.",
  ATTACHMENT_TYPE_NOT_ALLOWED: "This file type is not allowed.",
  REPORT_PARSE_FAILED: "Could not read the report file.",
  REPORT_NO_LINE_ITEMS: "The report has no line items.",
  OPCO_UNLINKED_PARTNERS_IN_FILE:
    "This file has partners that are not linked to your OpCo.",
  STORAGE_WRITE_FAILED: "File upload failed. Please try again.",
  STORAGE_READ_FAILED: "Could not load the file. Please try again.",
  STORAGE_NOT_CONFIGURED: "File upload failed. Please try again.",
  STORAGE_OBJECT_NOT_FOUND: "File not found.",
  INVOICE_UPLOAD_FAILED: "Invoice upload failed. Please try again.",
  SYSTEM_ERROR: "Something went wrong. Please try again.",
  UNMAPPED_ERROR: "Something went wrong. Please try again.",
};

const DEFAULT_CLIENT_MESSAGE = "Something went wrong. Please try again.";

/** @deprecated Prefer plain client messages; kept for rare diagnostic tooling. */
export function formatErrorDisplay(code: number, message: string): string {
  return `ERROR ${code} — ${message}`;
}

export function formatAppErrorPayload(payload: AppErrorPayload): string {
  if (payload.key && isErrorKey(payload.key) && CLIENT_MESSAGES[payload.key]) {
    return CLIENT_MESSAGES[payload.key]!;
  }
  return DEFAULT_CLIENT_MESSAGE;
}

function clientMessageForKey(key: ErrorKey): string {
  return CLIENT_MESSAGES[key] ?? DEFAULT_CLIENT_MESSAGE;
}

function extractErrorKey(input: unknown): ErrorKey | null {
  if (typeof input === "string") {
    if (isErrorKey(input)) return input;
    return resolveErrorKeyFromMessage(input);
  }
  if (input instanceof Error) {
    return extractErrorKey(input.message);
  }
  if (input && typeof input === "object") {
    const body = input as {
      error?: unknown;
      key?: unknown;
      message?: unknown;
    };
    const nested = body.error;
    if (nested && typeof nested === "object") {
      const payload = nested as Partial<AppErrorPayload>;
      if (typeof payload.key === "string" && isErrorKey(payload.key)) {
        return payload.key;
      }
      if (typeof payload.message === "string") {
        return resolveErrorKeyFromMessage(payload.message);
      }
    }
    if (typeof nested === "string") {
      return extractErrorKey(nested);
    }
    if (typeof body.key === "string" && isErrorKey(body.key)) {
      return body.key;
    }
    if (typeof body.message === "string") {
      return resolveErrorKeyFromMessage(body.message);
    }
  }
  return null;
}

/**
 * Returns a short user-facing message.
 * Prefer `fallbackMessage` from the call site (e.g. "Failed to upload report").
 * Free-text validation strings (legacy `{ error: "…" }`) are shown as-is when
 * they are not catalog keys — those are intentional Excel/mapping hints.
 */
export function formatAppError(
  input: unknown,
  fallbackMessage?: string,
): string {
  if (fallbackMessage?.trim()) {
    const key = extractErrorKey(input);
    // Auth / rate-limit: prefer specific copy over generic fallback.
    if (
      key &&
      (key === "INVALID_CREDENTIALS" ||
        key === "RATE_LIMITED" ||
        key === "UNAUTHORIZED" ||
        key === "USER_NOT_ACTIVE" ||
        key === "ACCOUNT_NOT_ACTIVE")
    ) {
      return clientMessageForKey(key);
    }
    return fallbackMessage.trim();
  }

  if (typeof input === "string") {
    const key = isErrorKey(input)
      ? input
      : resolveErrorKeyFromMessage(input);
    if (key) {
      return clientMessageForKey(key);
    }
    const trimmed = input.trim();
    return trimmed || DEFAULT_CLIENT_MESSAGE;
  }

  if (input instanceof Error) {
    return formatAppError(input.message);
  }

  if (input && typeof input === "object") {
    const body = input as { error?: unknown };
    const nested = body.error;

    if (typeof nested === "string") {
      return formatAppError(nested);
    }

    const key = extractErrorKey(input);
    if (key) {
      return clientMessageForKey(key);
    }
  }

  if (input == null) {
    return DEFAULT_CLIENT_MESSAGE;
  }

  return DEFAULT_CLIENT_MESSAGE;
}
