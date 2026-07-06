import { describe, expect, it } from "vitest";

import { reportChangeRequestSchema } from "@/lib/opco/validation/change-request";

describe("report change request validation", () => {
  it("accepts valid change request input", () => {
    const result = reportChangeRequestSchema.safeParse({
      reportId: "42",
      reason: "Incorrect usage amounts in rows 12-15 need correction.",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing report id", () => {
    const result = reportChangeRequestSchema.safeParse({
      reportId: "",
      reason: "Incorrect usage amounts in rows 12-15 need correction.",
    });

    expect(result.success).toBe(false);
  });

  it("rejects short reasons", () => {
    const result = reportChangeRequestSchema.safeParse({
      reportId: "42",
      reason: "Too short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects reasons over 2000 characters", () => {
    const result = reportChangeRequestSchema.safeParse({
      reportId: "42",
      reason: "x".repeat(2001),
    });

    expect(result.success).toBe(false);
  });
});
