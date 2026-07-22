import { describe, expect, it } from "vitest";

import {
  buildContentDispositionHeader,
  buildFileResponseHeaders,
  isInlinePreviewableMime,
  resolveDownloadMimeType,
} from "@/lib/platform/file-response-headers";

describe("resolveDownloadMimeType", () => {
  it("keeps an explicit image mime", () => {
    expect(resolveDownloadMimeType("shot.png", "image/png")).toBe("image/png");
  });

  it("infers png from extension when mime is missing or octet-stream", () => {
    expect(resolveDownloadMimeType("shot.PNG", null)).toBe("image/png");
    expect(resolveDownloadMimeType("shot.png", "application/octet-stream")).toBe(
      "image/png",
    );
  });
});

describe("buildFileResponseHeaders", () => {
  it("serves png inline with safe disposition", () => {
    const headers = buildFileResponseHeaders({
      filename: "shot.png",
      mimeType: "image/png",
    });
    expect(headers["Content-Type"]).toBe("image/png");
    expect(headers["Content-Disposition"]).toContain("inline;");
    expect(headers["Content-Disposition"]).toContain('filename="shot.png"');
    expect(headers["Content-Disposition"]).toContain(
      "filename*=UTF-8''shot.png",
    );
  });

  it("serves unicode filenames without throwing ByteString issues", () => {
    const headers = buildFileResponseHeaders({
      filename: "снимок.png",
      mimeType: "image/png",
    });
    expect(headers["Content-Type"]).toBe("image/png");
    expect(headers["Content-Disposition"]).toMatch(/^inline;/);
    expect(headers["Content-Disposition"]).toContain("filename*=UTF-8''");
    expect(headers["Content-Disposition"]).toContain(encodeURIComponent("снимок.png"));
    // ASCII fallback must be ByteString-safe
    expect([...headers["Content-Disposition"]].every((ch) => ch.charCodeAt(0) <= 255)).toBe(
      true,
    );
  });

  it("keeps spreadsheets as attachment downloads", () => {
    const headers = buildFileResponseHeaders({
      filename: "report.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    expect(headers["Content-Disposition"]).toMatch(/^attachment;/);
    expect(isInlinePreviewableMime(headers["Content-Type"])).toBe(false);
  });
});

describe("buildContentDispositionHeader", () => {
  it("escapes quotes in the ascii filename fallback", () => {
    expect(buildContentDispositionHeader('weird"name.png', "inline")).toContain(
      'filename="weird_name.png"',
    );
  });
});
