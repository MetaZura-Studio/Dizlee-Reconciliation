import { describe, expect, it } from "vitest";

import {
  assertExcelBufferMagic,
  validateExcelUploadFile,
} from "@/lib/platform/excel-upload";

function fakeFile(params: {
  name: string;
  type?: string;
  size?: number;
}): File {
  const size = params.size ?? 100;
  const blob = new Blob([new Uint8Array(size)], {
    type: params.type ?? "",
  });
  return new File([blob], params.name, { type: params.type ?? "" });
}

describe("validateExcelUploadFile", () => {
  it("accepts xlsx within size limit", () => {
    expect(
      validateExcelUploadFile(
        fakeFile({
          name: "rates.xlsx",
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      ),
    ).toBeNull();
  });

  it("rejects oversize files", () => {
    expect(
      validateExcelUploadFile(
        fakeFile({ name: "big.xlsx", size: 21 * 1024 * 1024 }),
      ),
    ).toBe("File exceeds the 20 MB upload limit");
  });

  it("rejects blocked MIME even with xlsx name", () => {
    expect(
      validateExcelUploadFile(
        fakeFile({ name: "rates.xlsx", type: "text/html" }),
      ),
    ).toBe("Invalid Excel file type");
  });

  it("allows legacy xls only when opted in", () => {
    expect(validateExcelUploadFile(fakeFile({ name: "old.xls" }))).toBe(
      "Only .xlsx files are supported",
    );
    expect(
      validateExcelUploadFile(fakeFile({ name: "old.xls" }), {
        allowLegacyXls: true,
      }),
    ).toBeNull();
  });
});

describe("assertExcelBufferMagic", () => {
  it("accepts a minimal valid xlsx zip", () => {
    const name = Buffer.from("xl/workbook.xml");
    const u16 = (n: number) => {
      const b = Buffer.alloc(2);
      b.writeUInt16LE(n, 0);
      return b;
    };
    const u32 = (n: number) => {
      const b = Buffer.alloc(4);
      b.writeUInt32LE(n, 0);
      return b;
    };
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(0),
      u32(32),
      u16(name.length),
      u16(0),
      name,
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
      u32(32),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(0),
      name,
    ]);
    const eocd = Buffer.concat([
      u32(0x06054b50),
      u16(0),
      u16(0),
      u16(1),
      u16(1),
      u32(central.length),
      u32(local.length),
      u16(0),
    ]);
    const buffer = Buffer.concat([local, central, eocd]);
    expect(assertExcelBufferMagic(buffer, "a.xlsx")).toBeNull();
  });

  it("rejects non-zip content named xlsx", () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(assertExcelBufferMagic(buffer, "a.xlsx")).toBe(
      "File content is not a valid Excel workbook (.xlsx)",
    );
  });
});
