/**
 * Shared notification-attachment constants (safe for client + server).
 * Keep allowlist in sync with server validation in notification-attachments.ts.
 */

export const MAX_NOTIFICATION_ATTACHMENTS = 5;

export const NOTIFICATION_ATTACHMENT_MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
  csv: "text/csv",
  txt: "text/plain",
};

export const NOTIFICATION_ATTACHMENT_ACCEPT = Object.keys(
  NOTIFICATION_ATTACHMENT_MIME_BY_EXT,
)
  .map((ext) => `.${ext}`)
  .join(",");

export const ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE =
  "Attachment type is not allowed. Use PDF, images (not SVG), Excel, CSV, or TXT.";
