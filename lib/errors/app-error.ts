/**
 * Application error type backed by the shared error catalog.
 */

import {
  ERROR_CATALOG,
  type ErrorKey,
  getErrorDefinition,
  isErrorKey,
  resolveErrorKeyFromMessage,
} from "@/lib/errors/catalog";

export type AppErrorPayload = {
  code: number;
  key: ErrorKey;
  message: string;
};

export type AppErrorOptions = {
  status?: number;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: number;
  readonly key: ErrorKey;
  readonly status: number;

  /** Alias for routes that historically used `statusCode`. */
  get statusCode(): number {
    return this.status;
  }

  constructor(key: ErrorKey, options?: AppErrorOptions) {
    const definition = getErrorDefinition(key);
    super(definition.message);
    this.name = "AppError";
    this.key = key;
    this.code = definition.code;
    this.status = options?.status ?? definition.status;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }

  toJSON(): AppErrorPayload {
    return {
      code: this.code,
      key: this.key,
      message: this.message,
    };
  }
}

export function appError(key: ErrorKey, options?: AppErrorOptions): AppError {
  return new AppError(key, options);
}

export function systemError(cause?: unknown): AppError {
  return new AppError("SYSTEM_ERROR", { cause });
}

/**
 * Resolve a catalog key or legacy free-text message into an AppError.
 * Prefer `appError("KEY")` at new call sites.
 */
export function appErrorFromUnknown(
  keyOrMessage: string,
  status?: number,
  cause?: unknown,
): AppError {
  const key = isErrorKey(keyOrMessage)
    ? keyOrMessage
    : (resolveErrorKeyFromMessage(keyOrMessage) ?? "UNMAPPED_ERROR");
  return new AppError(key, {
    status: status ?? ERROR_CATALOG[key].status,
    cause,
  });
}

/**
 * Base for domain-specific error classes that keep historical names
 * for `instanceof` checks while always carrying catalog codes.
 */
export class DomainError extends AppError {
  constructor(domainName: string, keyOrMessage: string, status?: number) {
    const resolvedKey = isErrorKey(keyOrMessage)
      ? keyOrMessage
      : resolveErrorKeyFromMessage(keyOrMessage);
    const key = resolvedKey ?? "UNMAPPED_ERROR";
    super(key, {
      status: status ?? ERROR_CATALOG[key].status,
    });
    this.name = domainName;
    if (!resolvedKey && keyOrMessage.trim()) {
      this.message = keyOrMessage.trim();
    }
  }
}
