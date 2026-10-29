/**
 * NextAuth credentials `authorize` throws these after a valid password check.
 * Login forms map them to ACCOUNT_SUSPENDED / ACCOUNT_NOT_ACTIVE.
 */
export const ACCOUNT_SUSPENDED_SIGNIN_ERROR = "AccountSuspended";
export const ACCOUNT_INACTIVE_SIGNIN_ERROR = "AccountInactive";

/** Thrown from authorize when login email rate limit is exceeded. */
export const RATE_LIMITED_SIGNIN_ERROR = "RATE_LIMITED";

/** Map next-auth signIn() failure to a catalog-facing error code. */
export function resolveCredentialsSignInError(result: {
  ok?: boolean;
  error?: string | null;
  status?: number;
} | null | undefined): string {
  if (result?.status === 429) {
    return "RATE_LIMITED";
  }
  if (result?.error === RATE_LIMITED_SIGNIN_ERROR) {
    return "RATE_LIMITED";
  }
  if (result?.error === ACCOUNT_SUSPENDED_SIGNIN_ERROR) {
    return ACCOUNT_SUSPENDED_SIGNIN_ERROR;
  }
  if (result?.error === ACCOUNT_INACTIVE_SIGNIN_ERROR) {
    return ACCOUNT_INACTIVE_SIGNIN_ERROR;
  }
  return "CredentialsSignin";
}
