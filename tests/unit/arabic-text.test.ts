import { describe, expect, it } from "vitest";

import {
  containsArabicScript,
  formatPreviewCellValue,
  isNumericCellValue,
  previewCellAlign,
} from "@/lib/ui/arabic-text";

describe("formatPreviewCellValue", () => {
  it("formats ISO date-only as dd/mm/yy", () => {
    expect(formatPreviewCellValue("2026-08-28")).toBe("28/08/26");
  });

  it("formats ISO datetime with time as dd/mm/yy, HH:mm", () => {
    expect(formatPreviewCellValue("2026-08-28T14:30:00.000Z")).toMatch(
      /^\d{2}\/\d{2}\/\d{2}, \d{2}:\d{2}$/,
    );
  });

  it("leaves non-date text unchanged", () => {
    expect(formatPreviewCellValue("خدمة الرسائل")).toBe("خدمة الرسائل");
    expect(formatPreviewCellValue("1234.56")).toBe("1234.56");
  });
});

describe("previewCellAlign", () => {
  it("right-aligns Arabic and numeric cells", () => {
    expect(previewCellAlign("خدمة الرسائل")).toBe("right");
    expect(previewCellAlign("1234.56")).toBe("right");
  });

  it("center-aligns app dates", () => {
    expect(previewCellAlign("2026-08-28")).toBe("center");
    expect(previewCellAlign("28/08/26")).toBe("center");
  });

  it("left-aligns latin text", () => {
    expect(previewCellAlign("Partner Name")).toBe("left");
  });
});

describe("containsArabicScript", () => {
  it("detects Arabic letters", () => {
    expect(containsArabicScript("خدمة")).toBe(true);
    expect(containsArabicScript("Service")).toBe(false);
  });
});

describe("isNumericCellValue", () => {
  it("matches plain numbers", () => {
    expect(isNumericCellValue("12")).toBe(true);
    expect(isNumericCellValue("-1.5")).toBe(true);
    expect(isNumericCellValue("1,234")).toBe(false);
    expect(isNumericCellValue("abc")).toBe(false);
  });
});
