/**
 * Shared Excel upload checks: size cap, extension, MIME, and xlsx ZIP safety.
 * Used by Admin imports and OpCo/Partner report uploads.
 */

import { assertSafeXlsxZip } from "@/lib/platform/excel/assert-safe-xlsx-zip";

export const MAX_EXCEL_UPLOAD_BYTES = 20 * 1024 * 1024;

export const XLSX_EXTENSIONS = [".xlsx"] as const;
export const EXCEL_EXTENSIONS_WITH_LEGACY = [".xlsx", ".xls"] as const;

export const XLSX_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
] as const;

export const EXCEL_MIME_TYPES_WITH_LEGACY = [
  ...XLSX_MIME_TYPES,
  "application/vnd.ms-excel",
] as const;

const BLOCKED_UPLOAD_MIME_SNIPPETS = [
  "text/html",
  "application/xhtml",
  "image/svg",
  "javascript",
  "ecmascript",
  "text/xml",
  "application/xml",
] as const;

export type ExcelUploadOptions = {
  /** When true, also allow legacy .xls (Admin imports). Default: xlsx only. */
  allowLegacyXls?: boolean;
  maxBytes?: number;
};

function normalizeMime(mimeType: string): string {
  return mimeType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
}

function isBlockedMime(mimeType: string): boolean {
  const normalized = normalizeMime(mimeType);
  if (!normalized) {
    return false;
  }
  return BLOCKED_UPLOAD_MIME_SNIPPETS.some((snippet) =>
    normalized.includes(snippet),
  );
}

export function validateExcelUploadFile(
  file: File | null,
  options: ExcelUploadOptions = {},
): string | null {
  if (!file) {
    return "Excel file is required";
  }

  const allowLegacyXls = options.allowLegacyXls === true;
  const maxBytes = options.maxBytes ?? MAX_EXCEL_UPLOAD_BYTES;
  const extensions = allowLegacyXls
    ? EXCEL_EXTENSIONS_WITH_LEGACY
    : XLSX_EXTENSIONS;
  const allowedMimes = allowLegacyXls
    ? EXCEL_MIME_TYPES_WITH_LEGACY
    : XLSX_MIME_TYPES;

  const lowerName = file.name.toLowerCase().trim();
  if (!extensions.some((ext) => lowerName.endsWith(ext))) {
    return allowLegacyXls
      ? "File must be an Excel workbook (.xlsx or .xls)"
      : "Only .xlsx files are supported";
  }

  const clientMime = normalizeMime(file.type ?? "");
  if (clientMime && isBlockedMime(clientMime)) {
    return "Invalid Excel file type";
  }
  if (
    clientMime &&
    !(allowedMimes as readonly string[]).includes(clientMime)
  ) {
    return "Invalid Excel file type";
  }

  if (file.size <= 0) {
    return "Uploaded file is empty";
  }

  if (file.size > maxBytes) {
    return `File exceeds the ${maxBytes / (1024 * 1024)} MB upload limit`;
  }

  return null;
}

/** .xlsx is a ZIP archive (PK..). .xls uses the OLE compound header. */
export function assertExcelBufferMagic(
  buffer: Buffer,
  filename: string,
): string | null {
  if (buffer.length < 4) {
    return "Uploaded file is empty";
  }

  const lower = filename.toLowerCase();
  const isZip =
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);
  const isOle =
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0;

  if (lower.endsWith(".xlsx") && !isZip) {
    return "File content is not a valid Excel workbook (.xlsx)";
  }
  if (lower.endsWith(".xls") && !isOle && !isZip) {
    return "File content is not a valid Excel workbook (.xls)";
  }
  if (lower.endsWith(".xlsx") && isZip) {
    return assertSafeXlsxZip(buffer);
  }
  return null;
}

export const DEFAULT_XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
