/**
 * Pure checks for notification attachment allowlist (unit-testable, no server-only).
 */
import { fileExtension } from "@/lib/platform/file-response-headers";
import {
  ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE,
  NOTIFICATION_ATTACHMENT_MIME_BY_EXT,
} from "@/lib/platform/notification-attachments.shared";

const BLOCKED_CLIENT_MIME = new Set([
  "image/svg+xml",
  "image/svg",
  "text/html",
  "application/xhtml+xml",
  "text/xml",
  "application/xml",
  "application/javascript",
  "text/javascript",
  "application/x-javascript",
]);

export function resolveAllowedNotificationAttachmentMime(params: {
  filename: string;
  clientMimeType?: string | null;
}): { mimeType: string } | { error: string } {
  const ext = fileExtension(params.filename);
  const allowedMime = NOTIFICATION_ATTACHMENT_MIME_BY_EXT[ext];
  if (!allowedMime) {
    return { error: ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE };
  }

  const clientMime =
    params.clientMimeType?.trim().toLowerCase().split(";")[0]?.trim() ?? "";
  if (clientMime && BLOCKED_CLIENT_MIME.has(clientMime)) {
    return { error: ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE };
  }
  if (
    clientMime &&
    (clientMime.includes("svg") ||
      clientMime.includes("html") ||
      clientMime.includes("javascript"))
  ) {
    return { error: ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE };
  }

  return { mimeType: allowedMime };
}
