import { describe, expect, it } from "vitest";

import {
  ACCOUNT_SUSPENDED_SIGNIN_ERROR,
  resolveCredentialsSignInError,
} from "@/lib/auth/login-errors";
import { formatAppError } from "@/lib/errors/format";

describe("resolveCredentialsSignInError", () => {
  it("maps AccountSuspended from next-auth", () => {
    expect(
      resolveCredentialsSignInError({
        ok: false,
        error: ACCOUNT_SUSPENDED_SIGNIN_ERROR,
        status: 401,
      }),
    ).toBe(ACCOUNT_SUSPENDED_SIGNIN_ERROR);
  });

  it("maps rate limit status", () => {
    expect(
      resolveCredentialsSignInError({ ok: false, error: null, status: 429 }),
    ).toBe("RATE_LIMITED");
  });

  it("defaults other failures to CredentialsSignin", () => {
    expect(
      resolveCredentialsSignInError({
        ok: false,
        error: "CredentialsSignin",
        status: 401,
      }),
    ).toBe("CredentialsSignin");
  });
});

describe("ACCOUNT_SUSPENDED client copy", () => {
  it("tells the user to contact support", () => {
    expect(formatAppError("ACCOUNT_SUSPENDED")).toBe(
      "Your account has been suspended. Contact support.",
    );
  });
});
