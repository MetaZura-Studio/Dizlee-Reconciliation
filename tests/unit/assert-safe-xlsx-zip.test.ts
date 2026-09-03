import { describe, expect, it } from "vitest";

import {
  assertSafeXlsxZip,
  MAX_XLSX_UNCOMPRESSED_BYTES,
  MAX_XLSX_ZIP_ENTRIES,
} from "@/lib/platform/excel/assert-safe-xlsx-zip";

function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n, 0);
  return b;
}

function u32(n: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

/** Minimal store-compressed ZIP with one file and declared uncompressed size. */
function buildZip(params: {
  name: string;
  uncompressedSize: number;
  entryCount?: number;
}): Buffer {
  const name = Buffer.from(params.name, "utf8");
  const data = Buffer.alloc(0);
  const local = Buffer.concat([
    u32(0x04034b50),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    u32(params.uncompressedSize),
    u16(name.length),
    u16(0),
    name,
    data,
  ]);

  const central = Buffer.concat([
    u32(0x02014b50),
    u16(20),
    u16(20),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    u32(params.uncompressedSize),
    u16(name.length),
    u16(0),
    u16(0),
    u16(0),
    u16(0),
    u32(0),
    u32(0),
    name,
  ]);

  const count = params.entryCount ?? 1;
  const centrals = Buffer.concat(Array.from({ length: count }, () => central));

  const eocd = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(count),
    u16(count),
    u32(centrals.length),
    u32(local.length),
    u16(0),
  ]);

  return Buffer.concat([local, centrals, eocd]);
}

describe("assertSafeXlsxZip", () => {
  it("accepts a small declared workbook", () => {
    const zip = buildZip({ name: "xl/workbook.xml", uncompressedSize: 1024 });
    expect(assertSafeXlsxZip(zip)).toBeNull();
  });

  it("rejects oversized uncompressed totals", () => {
    // Two CD entries so the sum exceeds the cap without relying on a single huge field.
    const half = Math.floor(MAX_XLSX_UNCOMPRESSED_BYTES / 2) + 1;
    const zip = buildZip({
      name: "xl/bomb.xml",
      uncompressedSize: half,
      entryCount: 2,
    });
    const message = assertSafeXlsxZip(zip);
    expect(typeof message).toBe("string");
    expect(message).toMatch(/safe size limit/i);
  });

  it("rejects too many entries", () => {
    const zip = buildZip({
      name: "xl/a.xml",
      uncompressedSize: 10,
      entryCount: MAX_XLSX_ZIP_ENTRIES + 1,
    });
    expect(assertSafeXlsxZip(zip)).toMatch(/too many/i);
  });

  it("rejects non-zip buffers", () => {
    expect(assertSafeXlsxZip(Buffer.from("not-a-zip"))).not.toBeNull();
  });
});
