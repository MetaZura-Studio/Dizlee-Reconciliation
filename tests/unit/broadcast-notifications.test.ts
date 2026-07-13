import { beforeEach, describe, expect, it, vi } from "vitest";

const mockedGetActiveEmailTemplate = vi.fn();

vi.mock("@/lib/platform/email-templates", () => ({
  getActiveEmailTemplate: (...args: unknown[]) =>
    mockedGetActiveEmailTemplate(...args),
}));

import {
  NotificationError,
  resolveBroadcastMessage,
  validateBroadcastRecipients,
} from "@/lib/dizlee/notifications/intimations";
import {
  applyTemplate,
  periodLabel,
} from "@/lib/platform/template-placeholders";

describe("template placeholders", () => {
  it("formats period label", () => {
    expect(periodLabel(7, 2026)).toBe("July 2026");
  });

  it("substitutes template tokens", () => {
    expect(
      applyTemplate("Report for {{period}}", { period: "July 2026" }),
    ).toBe("Report for July 2026");
  });
});

describe("validateBroadcastRecipients", () => {
  it("requires OpCos when audience is opco", () => {
    expect(() =>
      validateBroadcastRecipients({
        audience: "opco",
        opcoIds: [],
        partnerIds: [],
        messageSource: "custom",
      }),
    ).toThrowError(new NotificationError("Select at least one OpCo.", 400));
  });

  it("requires Partners when audience is partner", () => {
    expect(() =>
      validateBroadcastRecipients({
        audience: "partner",
        opcoIds: [],
        partnerIds: [],
        messageSource: "custom",
      }),
    ).toThrowError(new NotificationError("Select at least one Partner.", 400));
  });

  it("requires at least one recipient when audience is both", () => {
    expect(() =>
      validateBroadcastRecipients({
        audience: "both",
        opcoIds: [],
        partnerIds: [],
        messageSource: "custom",
      }),
    ).toThrowError(
      new NotificationError("Select at least one OpCo or Partner.", 400),
    );
  });

  it("returns deduplicated recipient ids", () => {
    expect(
      validateBroadcastRecipients({
        audience: "both",
        opcoIds: ["1", "1", " 2 "],
        partnerIds: ["3", "3"],
        messageSource: "custom",
      }),
    ).toEqual({
      opcoIds: ["1", "2"],
      partnerIds: ["3"],
    });
  });
});

describe("resolveBroadcastMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires subject and body for custom messages", async () => {
    await expect(
      resolveBroadcastMessage({
        audience: "opco",
        opcoIds: ["1"],
        partnerIds: [],
        messageSource: "custom",
        subject: "",
        body: "Hello",
      }),
    ).rejects.toThrowError(new NotificationError("Subject is required.", 400));

    await expect(
      resolveBroadcastMessage({
        audience: "opco",
        opcoIds: ["1"],
        partnerIds: [],
        messageSource: "custom",
        subject: "Hello",
        body: "",
      }),
    ).rejects.toThrowError(
      new NotificationError("Message body is required.", 400),
    );
  });

  it("requires month and year for template messages", async () => {
    await expect(
      resolveBroadcastMessage({
        audience: "opco",
        opcoIds: ["1"],
        partnerIds: [],
        messageSource: "REPORT_REMINDER",
      }),
    ).rejects.toThrowError(
      new NotificationError(
        "Month and year are required when using a template.",
        400,
      ),
    );
  });

  it("substitutes period placeholder from admin template", async () => {
    mockedGetActiveEmailTemplate.mockResolvedValue({
      code: "REPORT_REMINDER",
      subject: "Reminder for {{period}}",
      body: "Please upload for {{period}}.",
    });

    const result = await resolveBroadcastMessage({
      audience: "opco",
      opcoIds: ["1"],
      partnerIds: [],
      messageSource: "REPORT_REMINDER",
      month: 7,
      year: 2026,
    });

    expect(result).toEqual({
      subject: "Reminder for July 2026",
      body: "Please upload for July 2026.",
    });
  });

  it("allows edited subject and body overrides for templates", async () => {
    mockedGetActiveEmailTemplate.mockResolvedValue({
      code: "INVOICE_SUBMISSION",
      subject: "Default subject",
      body: "Default body for {{period}}.",
    });

    const result = await resolveBroadcastMessage({
      audience: "partner",
      opcoIds: [],
      partnerIds: ["1"],
      messageSource: "INVOICE_SUBMISSION",
      month: 1,
      year: 2026,
      subject: "Custom subject",
      body: "Custom body for {{period}}.",
    });

    expect(result).toEqual({
      subject: "Custom subject",
      body: "Custom body for January 2026.",
    });
  });
});
