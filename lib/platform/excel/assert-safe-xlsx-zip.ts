/**
 * Reject xlsx (ZIP) archives whose declared uncompressed size or entry count
 * could OOM exceljs before parse. Inspects the ZIP central directory only —
 * does not decompress entries.
 */

export const MAX_XLSX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
export const MAX_XLSX_ZIP_ENTRIES = 10_000;

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

function readUInt32LE(buffer: Buffer, offset: number): number {
  return buffer.readUInt32LE(offset);
}

function readUInt16LE(buffer: Buffer, offset: number): number {
  return buffer.readUInt16LE(offset);
}

/** Locate End of Central Directory (supports archives without ZIP64). */
function findEocdOffset(buffer: Buffer): number | null {
  const minEocd = 22;
  if (buffer.length < minEocd) {
    return null;
  }
  const maxComment = 0xffff;
  const start = Math.max(0, buffer.length - (minEocd + maxComment));
  for (let i = buffer.length - minEocd; i >= start; i -= 1) {
    if (readUInt32LE(buffer, i) === EOCD_SIG) {
      return i;
    }
  }
  return null;
}

/**
 * Returns an error message if the buffer is not a safe .xlsx ZIP, otherwise null.
 * Call after magic-byte ZIP confirmation for .xlsx files.
 */
export function assertSafeXlsxZip(buffer: Buffer): string | null {
  if (buffer.length < 4) {
    return "Uploaded file is empty";
  }

  const eocd = findEocdOffset(buffer);
  if (eocd == null) {
    return "File content is not a valid Excel workbook (.xlsx)";
  }

  const totalEntries = readUInt16LE(buffer, eocd + 10);
  const centralSize = readUInt32LE(buffer, eocd + 12);
  const centralOffset = readUInt32LE(buffer, eocd + 16);

  if (totalEntries > MAX_XLSX_ZIP_ENTRIES) {
    return "Excel workbook has too many internal entries";
  }

  if (
    centralOffset < 0 ||
    centralSize < 0 ||
    centralOffset + centralSize > buffer.length
  ) {
    return "File content is not a valid Excel workbook (.xlsx)";
  }

  let offset = centralOffset;
  const end = centralOffset + centralSize;
  let uncompressedTotal = 0;
  let counted = 0;

  while (offset + 46 <= end && counted < totalEntries) {
    if (readUInt32LE(buffer, offset) !== CEN_SIG) {
      return "File content is not a valid Excel workbook (.xlsx)";
    }
    const compressed = readUInt32LE(buffer, offset + 20);
    const uncompressed = readUInt32LE(buffer, offset + 24);
    const nameLen = readUInt16LE(buffer, offset + 28);
    const extraLen = readUInt16LE(buffer, offset + 30);
    const commentLen = readUInt16LE(buffer, offset + 32);

    // Prefer declared uncompressed; fall back to compressed if both look unset.
    const declared = uncompressed > 0 ? uncompressed : compressed;
    uncompressedTotal += declared;
    if (uncompressedTotal > MAX_XLSX_UNCOMPRESSED_BYTES) {
      return "Excel workbook expands beyond the safe size limit";
    }

    offset += 46 + nameLen + extraLen + commentLen;
    counted += 1;
  }

  if (counted !== totalEntries) {
    return "File content is not a valid Excel workbook (.xlsx)";
  }

  return null;
}
