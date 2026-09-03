/**
 * Bcrypt password hashing and verification for credentials auth.
 * Consumed by NextAuth authorize, password flows, and admin user provisioning.
 */

import { compare, hash } from "bcryptjs";

const BCRYPT_ROUNDS = 12;

/**
 * Fixed bcrypt hash used only to equalize login timing when the user is missing
 * or inactive (never a real password).
 */
const DUMMY_PASSWORD_HASH =
  "$2b$12$fodEJcF0ezb8Q1DnAJxgDO8DtIIITV7fLRuSITwMDojjUnaKZWelC";

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  passwordHash: string,
): Promise<boolean> {
  return compare(plain, passwordHash);
}

/** Run a bcrypt compare that always fails — mitigates user-enumeration timing. */
export async function runDummyPasswordCheck(plain: string): Promise<void> {
  await compare(plain, DUMMY_PASSWORD_HASH);
}
