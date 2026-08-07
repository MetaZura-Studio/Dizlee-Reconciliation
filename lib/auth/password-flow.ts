/**
 * End-to-end password invite, reset, change, and forgot flows with persistence.
 * Consumed by auth API routes and admin user actions; throws PasswordFlowError with HTTP status.
 */

import { z } from "zod";

import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  passwordSchema,
  validatePasswordMatch,
} from "@/lib/auth/password-policy";
import { sendPasswordEmail } from "@/lib/auth/mail";
import {
  generatePasswordResetToken,
  getPasswordResetTtlMs,
  hashPasswordResetToken,
  type PasswordResetPurpose,
} from "@/lib/auth/password-reset";
import type { AppSessionUser } from "@/lib/auth/types";
import { prisma } from "@/lib/prisma";

export class PasswordFlowError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "PasswordFlowError";
    this.status = status;
  }
}

const setPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset link is invalid or expired"),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, context) => {
    const mismatch = validatePasswordMatch(data.password, data.confirmPassword);
    if (mismatch) {
      context.addIssue({
        code: "custom",
        message: mismatch,
        path: ["confirmPassword"],
      });
    }
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .superRefine((data, context) => {
    const mismatch = validatePasswordMatch(data.password, data.confirmPassword);
    if (mismatch) {
      context.addIssue({
        code: "custom",
        message: mismatch,
        path: ["confirmPassword"],
      });
    }
  });

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

/** Issues a one-time token, persists hash, and sends the purpose-specific email. */
export async function issuePasswordResetForUser(
  userId: bigint,
  purpose: PasswordResetPurpose,
): Promise<{ token: string; emailResult: Awaited<ReturnType<typeof sendPasswordEmail>> }> {
  const user = await prisma.user.findFirst({
    where: { id: userId, isDeleted: false },
    select: { id: true, email: true, name: true, status: { select: { code: true } } },
  });

  if (!user) {
    throw new PasswordFlowError("User not found", 404);
  }

  if (user.status.code !== "ACTIVE") {
    throw new PasswordFlowError("User account is not active");
  }

  const token = generatePasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);
  const expiresAt = new Date(Date.now() + getPasswordResetTtlMs(purpose));

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: tokenHash,
      passwordResetExpiresAt: expiresAt,
    },
  });

  const emailResult = await sendPasswordEmail({
    to: user.email,
    name: user.name,
    token,
    purpose,
  });

  return { token, emailResult };
}

export async function setPasswordWithToken(rawInput: {
  token: string;
  password: string;
  confirmPassword: string;
}): Promise<void> {
  const parsed = setPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new PasswordFlowError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const tokenHash = hashPasswordResetToken(parsed.data.token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      isDeleted: false,
    },
    include: {
      status: true,
    },
  });

  if (!user?.passwordResetExpiresAt) {
    throw new PasswordFlowError("This link is invalid or has expired", 400);
  }

  if (user.passwordResetExpiresAt.getTime() < Date.now()) {
    throw new PasswordFlowError("This link has expired. Request a new one.", 400);
  }

  if (user.status.code !== "ACTIVE") {
    throw new PasswordFlowError("This account is not active", 403);
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });
}

export async function changePasswordForUser(
  sessionUser: AppSessionUser,
  rawInput: {
    currentPassword: string;
    password: string;
    confirmPassword: string;
  },
): Promise<void> {
  const parsed = changePasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new PasswordFlowError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const user = await prisma.user.findFirst({
    where: { id: BigInt(sessionUser.id), isDeleted: false },
    select: { id: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new PasswordFlowError(
      "No password is set yet. Use the link from your invite email.",
      400,
    );
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    throw new PasswordFlowError("Current password is incorrect", 400);
  }

  if (parsed.data.currentPassword === parsed.data.password) {
    throw new PasswordFlowError("New password must be different from the current password");
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });
}

/** Always resolves without revealing whether the email exists. */
export async function requestForgotPassword(rawInput: {
  email: string;
}): Promise<{ message: string }> {
  const parsed = forgotPasswordSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new PasswordFlowError(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findFirst({
    where: { email, isDeleted: false },
    include: {
      role: true,
      status: true,
    },
  });

  const genericMessage =
    "If an account exists for that email, we sent a password reset link.";

  if (!user || user.status.code !== "ACTIVE") {
    return { message: genericMessage };
  }

  await issuePasswordResetForUser(user.id, "forgot");

  return { message: genericMessage };
}

export async function validatePasswordResetToken(token: string): Promise<boolean> {
  if (!token.trim()) {
    return false;
  }

  const tokenHash = hashPasswordResetToken(token);
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: tokenHash,
      isDeleted: false,
    },
    select: { passwordResetExpiresAt: true },
  });

  if (!user?.passwordResetExpiresAt) {
    return false;
  }

  return user.passwordResetExpiresAt.getTime() >= Date.now();
}
