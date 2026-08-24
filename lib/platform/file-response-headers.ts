/**
 * HTTP file response helpers — Content-Disposition safety and MIME resolution from extension.
 * Used by attachment downloads and stored-file preview routes.
 * Never serves SVG/HTML (or other scriptable types) inline — blocks stored XSS via downloads.
 */

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  xls: "application/vnd.ms-excel",
};

/** Types that must never be Content-Disposition: inline (scriptable in browsers). */
const NEVER_INLINE_MIME = new Set([
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

export function fileExtension(filename: string): string {
  const base = filename.trim().split(/[/\\]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) {
    return "";
  }
  return base.slice(dot + 1).toLowerCase();
}

export function resolveDownloadMimeType(
  filename: string,
  mimeType: string | null | undefined,
): string {
  const trimmed = mimeType?.trim();
  if (trimmed && trimmed !== "application/octet-stream") {
    return trimmed.split(";")[0]?.trim() || trimmed;
  }
  const fromExt = EXT_MIME[fileExtension(filename)];
  return fromExt ?? trimmed ?? "application/octet-stream";
}

function normalizeMime(mimeType: string): string {
  return mimeType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
}

export function isInlinePreviewableMime(mimeType: string): boolean {
  const normalized = normalizeMime(mimeType);
  if (!normalized || NEVER_INLINE_MIME.has(normalized)) {
    return false;
  }
  // Any SVG / HTML / XML variant — never inline.
  if (
    normalized.includes("svg") ||
    normalized.includes("html") ||
    normalized.endsWith("+xml")
  ) {
    return false;
  }
  // Safe raster images + PDF only (not text/* — avoids text/html sniffing).
  return normalized.startsWith("image/") || normalized === "application/pdf";
}

function asciiFilenameFallback(filename: string): string {
  const cleaned = filename
    .replace(/[\r\n"]+/g, "_")
    .replace(/[^\x20-\x7E]+/g, "_")
    .trim();
  return cleaned.length > 0 ? cleaned : "download";
}

/**
 * RFC 6266 / 5987 Content-Disposition that stays within ByteString
 * (ASCII filename= plus UTF-8 filename*).
 */
export function buildContentDispositionHeader(
  filename: string,
  disposition: "inline" | "attachment",
): string {
  const fallback = asciiFilenameFallback(filename);
  const encoded = encodeURIComponent(filename);
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

export function buildFileResponseHeaders(params: {
  filename: string;
  mimeType: string | null | undefined;
  /** Force download even for normally previewable types. */
  forceAttachment?: boolean;
}): Record<string, string> {
  const contentType = resolveDownloadMimeType(params.filename, params.mimeType);
  const disposition =
    params.forceAttachment || !isInlinePreviewableMime(contentType)
      ? "attachment"
      : "inline";
  return {
    "Content-Type": contentType,
    "Content-Disposition": buildContentDispositionHeader(
      params.filename,
      disposition,
    ),
    "X-Content-Type-Options": "nosniff",
  };
}
