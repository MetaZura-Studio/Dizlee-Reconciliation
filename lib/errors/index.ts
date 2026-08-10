/**
 * Shared application error codes and helpers.
 */

export {
  ERROR_CATALOG,
  getErrorDefinition,
  isErrorKey,
  resolveErrorKeyFromMessage,
  type ErrorDefinition,
  type ErrorKey,
} from "@/lib/errors/catalog";

export {
  AppError,
  DomainError,
  appError,
  appErrorFromUnknown,
  systemError,
  type AppErrorOptions,
  type AppErrorPayload,
} from "@/lib/errors/app-error";

export {
  formatAppError,
  formatAppErrorPayload,
  formatErrorDisplay,
} from "@/lib/errors/format";

export {
  jsonError,
  unauthorized,
  validationFailed,
  type ApiErrorBody,
} from "@/lib/errors/respond";
