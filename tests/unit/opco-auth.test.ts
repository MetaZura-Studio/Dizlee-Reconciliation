import { describe, expect, it } from "vitest";

import { isOpcoRole } from "@/lib/opco/auth";

describe("opco auth helpers", () => {
  it("identifies opco role", () => {
    expect(isOpcoRole("opco")).toBe(true);
    expect(isOpcoRole("admin")).toBe(false);
    expect(isOpcoRole("partner")).toBe(false);
    expect(isOpcoRole("client")).toBe(false);
  });
});
