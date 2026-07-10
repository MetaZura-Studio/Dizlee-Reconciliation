import { describe, expect, it } from "vitest";

import {
  formatPlaceholderTokens,
  getPlaceholdersForTemplate,
} from "@/lib/admin/email-templates.shared";
import {
  buildRevertChangeNote,
  getNextTemplateVersion,
} from "@/lib/admin/email-templates";
import {
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
});

describe("email template helpers", () => {
  it("computes next version number", () => {
    expect(getNextTemplateVersion(0)).toBe(1);
    expect(getNextTemplateVersion(2)).toBe(3);
  });

  it("builds revert change note", () => {
    expect(buildRevertChangeNote(1)).toBe("Reverted to version 1");
  });

  it("returns placeholders per template code", () => {
    expect(getPlaceholdersForTemplate("REPORT_REMINDER")).toEqual(["period"]);
    expect(getPlaceholdersForTemplate("REPORT_SUBMISSION")).toEqual(["period"]);
    expect(formatPlaceholderTokens(["period"])).toBe("{{period}}");
  });
});
