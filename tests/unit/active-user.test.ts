import { describe, expect, it } from "vitest";

import { shouldRevalidateAuthUser } from "@/lib/auth/active-user";

describe("shouldRevalidateAuthUser", () => {
  it("revalidates when lastValidatedAt is missing", () => {
    expect(shouldRevalidateAuthUser(undefined, 1_000)).toBe(true);
    expect(shouldRevalidateAuthUser("bad", 1_000)).toBe(true);
  });

  it("skips when within the interval", () => {
    expect(shouldRevalidateAuthUser(1_000, 1_000 + 29_999, 30_000)).toBe(false);
  });

  it("revalidates when the interval has elapsed", () => {
    expect(shouldRevalidateAuthUser(1_000, 1_000 + 30_000, 30_000)).toBe(true);
  });
});
