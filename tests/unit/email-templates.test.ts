import { describe, expect, it } from "vitest";

import {
  categoryLabel,
  getPlaceholdersForTemplate,
  formatPlaceholderTokens,
  suggestTemplateCodeFromName,
} from "@/lib/admin/email-templates.shared";
import {
  buildRevertChangeNote,
  getNextTemplateVersion,
} from "@/lib/admin/email-templates";
import {
  createEmailTemplateSchema,
  revertEmailTemplateSchema,
  saveEmailTemplateSchema,
} from "@/lib/admin/validation/email-templates";

describe("email template validation", () => {
  it("accepts valid save input", () => {
    const result = saveEmailTemplateSchema.safeParse({
      subject: "Report reminder",
      body: "Please submit for {{period}}.",
      changeNote: "Clarified wording",
    });
    expect(result.success).toBe(true);
  });

  it("allows empty or null change notes", () => {
    expect(
      saveEmailTemplateSchema.safeParse({
        subject: "Subject",
        body: "Body",
        changeNote: "",
      }).success,
    ).toBe(true);

    expect(
      saveEmailTemplateSchema.safeParse({
        subject: "Subject",
        body: "Body",
        changeNote: null,
      }).success,
    ).toBe(true);

    expect(
      saveEmailTemplateSchema.safeParse({
        subject: "Subject",
        body: "Body",
      }).success,
    ).toBe(true);
  });

  it("rejects blank subject or body", () => {
    expect(
      saveEmailTemplateSchema.safeParse({
        subject: "",
        body: "Body",
      }).success,
    ).toBe(false);

    expect(
      saveEmailTemplateSchema.safeParse({
        subject: "Subject",
        body: "",
      }).success,
    ).toBe(false);
  });

  it("accepts valid revert input", () => {
    const result = revertEmailTemplateSchema.safeParse({ version: 1 });
    expect(result.success).toBe(true);
  });

  it("accepts valid create input", () => {
    const result = createEmailTemplateSchema.safeParse({
      name: "Custom notice",
      code: "custom_notice",
      category: "INTIMATION",
      subject: "Hello {{period}}",
      body: "Body for {{period}}",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("CUSTOM_NOTICE");
      expect(result.data.category).toBe("INTIMATION");
    }
  });

  it("rejects invalid create codes and categories", () => {
    expect(
      createEmailTemplateSchema.safeParse({
        name: "Bad",
        code: "1STARTS_WITH_NUMBER",
        category: "INTIMATION",
        subject: "Subject",
        body: "Body",
      }).success,
    ).toBe(false);

    expect(
      createEmailTemplateSchema.safeParse({
        name: "Bad",
        code: "OK_CODE",
        category: "INVALID",
        subject: "Subject",
        body: "Body",
      }).success,
    ).toBe(false);
  });
});

describe("email template helpers", () => {
  it("computes next version number", () => {
    expect(getNextTemplateVersion(0)).toBe(1);
    expect(getNextTemplateVersion(2)).toBe(3);
  });

  it("builds revert change note", () => {
    expect(buildRevertChangeNote(1)).toBe("Reverted to version 1");
  });

  it("returns placeholders per template code and category", () => {
    expect(getPlaceholdersForTemplate("REPORT_REMINDER")).toEqual(["period"]);
    expect(getPlaceholdersForTemplate("PASSWORD_INVITE")).toEqual([
      "name",
      "link",
      "expiryHours",
    ]);
    expect(getPlaceholdersForTemplate("RECONCILIATION_ALERT_OPCO")).toEqual([
      "period",
      "opcoName",
      "partnerName",
      "status",
      "matchedCount",
      "unmatchedCount",
      "totalVariance",
      "tolerancePercent",
      "outcome",
    ]);
    expect(getPlaceholdersForTemplate("CUSTOM_X", "REMINDER")).toEqual([
      "period",
    ]);
    expect(getPlaceholdersForTemplate("CUSTOM_ALERT", "ALERT")).toContain(
      "opcoName",
    );
    expect(getPlaceholdersForTemplate("CUSTOM_Y", "OTHER")).toEqual([]);
    expect(formatPlaceholderTokens(["period"])).toBe("{{period}}");
  });

  it("labels categories and suggests codes", () => {
    expect(categoryLabel("INTIMATION")).toBe("Intimation");
    expect(categoryLabel("REMINDER")).toBe("Reminder");
    expect(categoryLabel("ALERT")).toBe("Alert");
    expect(categoryLabel("OTHER")).toBe("Other");
    expect(suggestTemplateCodeFromName("Custom notice!")).toBe("CUSTOM_NOTICE");
  });

  it("accepts ALERT category on create", () => {
    const result = createEmailTemplateSchema.safeParse({
      name: "Reconciliation alert",
      code: "RECONCILIATION_ALERT_CUSTOM",
      category: "ALERT",
      subject: "Alert {{period}}",
      body: "Body for {{opcoName}}",
    });
    expect(result.success).toBe(true);
  });
});
