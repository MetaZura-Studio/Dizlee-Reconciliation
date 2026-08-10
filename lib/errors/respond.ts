/**
 * Next.js API helpers that return the standard error envelope.
 */

import { NextResponse } from "next/server";

import {
  AppError,
  appError,
  appErrorFromUnknown,
  systemError,
} from "@/lib/errors/app-error";
import type { AppErrorPayload } from "@/lib/errors/app-error";
import { resolveErrorKeyFromMessage } from "@/lib/errors/catalog";

export type ApiErrorBody = {
  error: AppErrorPayload;
  details?: unknown;
};

function hasHttpStatus(
  error: unknown,
): error is Error & { status?: number; statusCode?: number } {
  return error instanceof Error;
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (hasHttpStatus(error)) {
    const status =
      typeof error.status === "number"
        ? error.status
        : typeof error.statusCode === "number"
          ? error.statusCode
          : undefined;
    const mapped = resolveErrorKeyFromMessage(error.message);
    if (mapped) {
      return appError(mapped, { status, cause: error });
    }
    return appErrorFromUnknown(error.message, status, error);
  }

  return systemError(error);
}

export function jsonError(
  error: unknown,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  const appErr = toAppError(error);

  if (appErr.key === "SYSTEM_ERROR" || appErr.key === "UNMAPPED_ERROR") {
    console.error("[api]", error);
  }

  const body: ApiErrorBody = { error: appErr.toJSON() };
  if (details !== undefined) {
    body.details = details;
  }

  return NextResponse.json(body, { status: appErr.status });
}

export function unauthorized(): NextResponse<ApiErrorBody> {
  return jsonError(appError("UNAUTHORIZED"));
}

export function validationFailed(
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return jsonError(appError("VALIDATION_FAILED"), details);
}
