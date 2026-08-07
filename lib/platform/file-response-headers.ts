/**
 * HTTP file response helpers — Content-Disposition safety and MIME resolution from extension.
 * Used by attachment downloads and stored-file preview routes.
 */

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  txt: "text/plain",
  csv: "text/csv",
};

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
    return trimmed;
  }
  const fromExt = EXT_MIME[fileExtension(filename)];
  return fromExt ?? trimmed ?? "application/octet-stream";
}

export function isInlinePreviewableMime(mimeType: string): boolean {
  return (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/")
  );
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
}): Record<string, string> {
  const contentType = resolveDownloadMimeType(params.filename, params.mimeType);
  const disposition = isInlinePreviewableMime(contentType)
    ? "inline"
    : "attachment";
  return {
    "Content-Type": contentType,
    "Content-Disposition": buildContentDispositionHeader(
      params.filename,
      disposition,
    ),
  };
}
