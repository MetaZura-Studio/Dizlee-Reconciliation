/**
 * Shared types and pure helpers for outbound email delivery logging.
 * Safe for unit tests without Prisma/Nodemailer.
 */

export const EMAIL_DELIVERY_STATUSES = [
  "SKIPPED",
  "ACCEPTED",
  "FAILED",
] as const;

export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];

export const EMAIL_DELIVERY_PURPOSES = [
  "PASSWORD_INVITE",
  "PASSWORD_FORGOT",
  "PLATFORM",
  "ADMIN_TEST",
  "NOTIFICATION",
  "INTIMATION",
  "REMINDER",
  "EVENT",
] as const;

export type EmailDeliveryPurpose = (typeof EMAIL_DELIVERY_PURPOSES)[number] | string;

export type EmailDeliverySkipReason =
  | "email_disabled"
  | "smtp_not_configured";

export type EmailDeliveryLogContext = {
  purpose: EmailDeliveryPurpose;
  notificationId?: bigint | string | null;
  actorUserId?: bigint | string | null;
  correlationId?: string | null;
};

const SUBJECT_MAX = 255;
const ERROR_MESSAGE_MAX = 2000;

export function truncateEmailSubject(subject: string): string {
  const trimmed = subject.trim();
  if (trimmed.length <= SUBJECT_MAX) {
    return trimmed || "(no subject)";
  }
  return `${trimmed.slice(0, SUBJECT_MAX - 1)}…`;
}

export function truncateEmailErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= ERROR_MESSAGE_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, ERROR_MESSAGE_MAX - 1)}…`;
}

/** Map Nodemailer / Node network errors to a short error_code. */
export function classifySmtpError(error: unknown): {
  errorCode: string;
  errorMessage: string;
} {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown SMTP error";

  const codeFromError =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : null;

  if (codeFromError) {
    return {
      errorCode: codeFromError.slice(0, 64),
      errorMessage: truncateEmailErrorMessage(raw),
    };
  }

  const upper = raw.toUpperCase();
  if (upper.includes("ETIMEDOUT") || upper.includes("TIMEOUT")) {
    return { errorCode: "ETIMEDOUT", errorMessage: truncateEmailErrorMessage(raw) };
  }
  if (upper.includes("ENOTFOUND")) {
    return { errorCode: "ENOTFOUND", errorMessage: truncateEmailErrorMessage(raw) };
  }
  if (upper.includes("ECONNREFUSED")) {
    return {
      errorCode: "ECONNREFUSED",
      errorMessage: truncateEmailErrorMessage(raw),
    };
  }
  if (upper.includes("EAUTH") || raw.toLowerCase().includes("authentication")) {
    return { errorCode: "EAUTH", errorMessage: truncateEmailErrorMessage(raw) };
  }

  return { errorCode: "SMTP", errorMessage: truncateEmailErrorMessage(raw) };
}

export function passwordPurposeToDeliveryPurpose(
  purpose: "invite" | "forgot",
): "PASSWORD_INVITE" | "PASSWORD_FORGOT" {
  return purpose === "invite" ? "PASSWORD_INVITE" : "PASSWORD_FORGOT";
}

export type OutboxEmailSendStatus =
  | "sent"
  | "not_sent"
  | "failed"
  | "partly_sent"
  | "not_applicable";

export type OutboxEmailAttemptHint = {
  status: string;
  skipReason?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type OutboxEmailSendSummary = {
  status: OutboxEmailSendStatus;
  /** Short status word: Sent / Not sent / Failed / … */
  label: string;
  /** Pill text that clarifies channel, e.g. "Email: Not sent". */
  pillLabel: string;
  /** Plain-language reason when email was not fully successful. */
  reason: string | null;
  attempted: number;
  accepted: number;
  failed: number;
  skipped: number;
};

const OUTBOX_EMAIL_LABELS: Record<OutboxEmailSendStatus, string> = {
  sent: "Sent",
  not_sent: "Not sent",
  failed: "Failed",
  partly_sent: "Partly sent",
  not_applicable: "System only",
};

const OUTBOX_EMAIL_PILL_LABELS: Record<OutboxEmailSendStatus, string> = {
  sent: "Email: Sent",
  not_sent: "Email: Not sent",
  failed: "Email: Failed",
  partly_sent: "Email: Partly sent",
  not_applicable: "System only",
};

/** Map SMTP skip/error fields to one plain-language Outbox reason. */
export function mapOutboxEmailReason(params: {
  status: OutboxEmailSendStatus;
  attempts: OutboxEmailAttemptHint[];
}): string | null {
  if (params.status === "not_applicable" || params.status === "sent") {
    return null;
  }

  if (params.status === "partly_sent") {
    return "Some recipients got the email; some did not.";
  }

  if (params.attempts.length === 0) {
    return "No email attempt was recorded for this message.";
  }

  const skipped = params.attempts.find(
    (attempt) => attempt.status.toUpperCase() === "SKIPPED",
  );
  if (skipped) {
    const skip = skipped.skipReason?.trim();
    if (skip === "email_disabled") {
      return "Email is turned off in Admin email settings.";
    }
    if (skip === "smtp_not_configured") {
      return "Email is not fully configured (SMTP).";
    }
    return "Email was not sent.";
  }

  const failed = params.attempts.find(
    (attempt) => attempt.status.toUpperCase() === "FAILED",
  );
  if (failed) {
    const code = (failed.errorCode ?? "").toUpperCase();
    const message = (failed.errorMessage ?? "").toLowerCase();
    if (
      code.includes("ETIMEDOUT") ||
      code.includes("TIMEOUT") ||
      message.includes("timeout") ||
      message.includes("etimedout")
    ) {
      return "Could not reach the mail server.";
    }
    if (
      code.includes("EAUTH") ||
      message.includes("authentication") ||
      message.includes("login")
    ) {
      return "Mail server login failed.";
    }
    if (code.includes("ENOTFOUND") || message.includes("enotfound")) {
      return "Could not find the mail server host.";
    }
    if (failed.errorMessage?.trim()) {
      return truncateEmailErrorMessage(failed.errorMessage.trim());
    }
    return "The email could not be sent.";
  }

  if (params.status === "not_sent") {
    return "Email was not sent.";
  }

  return null;
}

/** Aggregate SMTP attempt rows into a plain-language Outbox status. */
export function summarizeOutboxEmailSend(params: {
  deliveryChannel: string;
  attempts?: OutboxEmailAttemptHint[];
  /** @deprecated Prefer attempts — kept for simple status-only callers/tests. */
  statuses?: Array<"SKIPPED" | "ACCEPTED" | "FAILED" | string>;
}): OutboxEmailSendSummary {
  const channel = params.deliveryChannel.toUpperCase();
  const attempts: OutboxEmailAttemptHint[] =
    params.attempts ??
    (params.statuses ?? []).map((status) => ({ status }));

  if (channel === "SYSTEM") {
    return {
      status: "not_applicable",
      label: OUTBOX_EMAIL_LABELS.not_applicable,
      pillLabel: OUTBOX_EMAIL_PILL_LABELS.not_applicable,
      reason: null,
      attempted: 0,
      accepted: 0,
      failed: 0,
      skipped: 0,
    };
  }

  let accepted = 0;
  let failed = 0;
  let skipped = 0;
  for (const attempt of attempts) {
    const normalized = attempt.status.toUpperCase();
    if (normalized === "ACCEPTED") {
      accepted += 1;
    } else if (normalized === "FAILED") {
      failed += 1;
    } else if (normalized === "SKIPPED") {
      skipped += 1;
    }
  }

  const attempted = accepted + failed + skipped;
  let status: OutboxEmailSendStatus;
  if (attempted === 0 || (accepted === 0 && failed === 0 && skipped > 0)) {
    status = "not_sent";
  } else if (accepted > 0 && failed === 0) {
    status = "sent";
  } else if (failed > 0 && accepted === 0) {
    status = "failed";
  } else {
    status = "partly_sent";
  }

  return {
    status,
    label: OUTBOX_EMAIL_LABELS[status],
    pillLabel: OUTBOX_EMAIL_PILL_LABELS[status],
    reason: mapOutboxEmailReason({ status, attempts }),
    attempted,
    accepted,
    failed,
    skipped,
  };
}

export function parseBigIntId(
  value: bigint | string | null | undefined,
): bigint | null {
  if (value == null) {
    return null;
  }
  if (typeof value === "bigint") {
    return value;
  }
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}
