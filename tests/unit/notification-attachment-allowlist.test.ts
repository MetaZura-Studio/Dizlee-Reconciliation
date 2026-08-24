import { describe, expect, it } from "vitest";

import { resolveAllowedNotificationAttachmentMime } from "@/lib/platform/notification-attachment-allowlist";
import { ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE } from "@/lib/platform/notification-attachments.shared";

describe("resolveAllowedNotificationAttachmentMime", () => {
  it("allows pdf and png", () => {
    expect(
      resolveAllowedNotificationAttachmentMime({
        filename: "note.pdf",
        clientMimeType: "application/pdf",
      }),
    ).toEqual({ mimeType: "application/pdf" });
    expect(
      resolveAllowedNotificationAttachmentMime({ filename: "shot.PNG" }),
    ).toEqual({ mimeType: "image/png" });
  });

  it("rejects svg and html by extension", () => {
    expect(
      resolveAllowedNotificationAttachmentMime({ filename: "x.svg" }),
    ).toEqual({ error: ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE });
    expect(
      resolveAllowedNotificationAttachmentMime({ filename: "x.html" }),
    ).toEqual({ error: ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE });
  });

  it("rejects blocked client MIME even with png name", () => {
    expect(
      resolveAllowedNotificationAttachmentMime({
        filename: "shot.png",
        clientMimeType: "image/svg+xml",
      }),
    ).toEqual({ error: ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE });
  });
});
