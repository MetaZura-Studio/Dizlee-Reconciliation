/**
 * NextAuth credentials `authorize` throws this message for suspended users
 * (after a valid password check). Login forms map it to ACCOUNT_SUSPENDED.
 */
export const ACCOUNT_SUSPENDED_SIGNIN_ERROR = "AccountSuspended";

/** Map next-auth signIn() failure to a catalog-facing error code. */
export function resolveCredentialsSignInError(result: {
  ok?: boolean;
  error?: string | null;
  status?: number;
} | null | undefined): string {
  if (result?.status === 429) {
    return "RATE_LIMITED";
  }
  if (result?.error === ACCOUNT_SUSPENDED_SIGNIN_ERROR) {
    return ACCOUNT_SUSPENDED_SIGNIN_ERROR;
  }
  return "CredentialsSignin";
}
