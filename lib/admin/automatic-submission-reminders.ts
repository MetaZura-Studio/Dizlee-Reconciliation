/**
 * UC-07 — Automatic submission reminders (cron-ready orchestrator).
 *
 * External scheduler example:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     http://localhost:3000/api/admin/cron/submission-reminders
 *
 * Scheduling (Vercel cron, etc.) is intentionally not wired in this stub.
 */

import { isReminderPeriodEligible } from "@/lib/admin/reminder-duration";
import { getReminderSettings } from "@/lib/admin/reminder-settings";
import { sendMissingReportReminders } from "@/lib/platform/report-reminders";
import { prisma } from "@/lib/prisma";

export type AutomaticReminderSkipReason =
  | "disabled"
  | "invalid_schedule"
  | "not_eligible"
  | "no_missing_reports";

export type AutomaticReminderPeriod = {
  month: number;
  year: number;
};

export type RunAutomaticSubmissionRemindersResult =
  | {
      status: "skipped";
      reason: AutomaticReminderSkipReason;
      period: AutomaticReminderPeriod;
      opcoNotifications: 0;
      partnerNotifications: 0;
      message: string;
    }
  | {
      status: "sent";
      period: AutomaticReminderPeriod;
      opcoNotifications: number;
      partnerNotifications: number;
      message: string;
    };

function currentPeriod(now: Date): AutomaticReminderPeriod {
  return {
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  };
}

export async function resolveAutomaticReminderActorId(
  explicitId?: bigint,
): Promise<bigint> {
  if (explicitId) {
    return explicitId;
  }

  const envUserId = process.env.SYSTEM_USER_ID?.trim();
  if (envUserId) {
    return BigInt(envUserId);
  }

  const adminUser = await prisma.user.findFirst({
    where: {
      email: "admin@dizlee.com",
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!adminUser) {
    throw new Error(
      "Automatic reminder actor not found. Set SYSTEM_USER_ID or seed admin@dizlee.com.",
    );
  }

  return adminUser.id;
}

export async function runAutomaticSubmissionReminders(params?: {
  now?: Date;
  fromUserId?: bigint;
}): Promise<RunAutomaticSubmissionRemindersResult> {
  const now = params?.now ?? new Date();
  const period = currentPeriod(now);

  const settings = await getReminderSettings();

  if (!settings.remindersEnabled) {
    return {
      status: "skipped",
      reason: "disabled",
      period,
      opcoNotifications: 0,
      partnerNotifications: 0,
      message: "Automatic submission reminders are disabled.",
    };
  }

  if (
    settings.reminderValue === null ||
    settings.reminderValue < 1 ||
    !settings.reminderUnit
  ) {
    return {
      status: "skipped",
      reason: "invalid_schedule",
      period,
      opcoNotifications: 0,
      partnerNotifications: 0,
      message: "Reminder schedule is not configured.",
    };
  }

  const eligible = isReminderPeriodEligible({
    periodYear: period.year,
    periodMonth: period.month,
    reminderValue: settings.reminderValue,
    reminderUnit: settings.reminderUnit,
    now,
  });

  if (!eligible) {
    return {
      status: "skipped",
      reason: "not_eligible",
      period,
      opcoNotifications: 0,
      partnerNotifications: 0,
      message: "Reporting period is not yet eligible for automatic reminders.",
    };
  }

  const fromUserId = await resolveAutomaticReminderActorId(params?.fromUserId);

  const result = await sendMissingReportReminders({
    month: period.month,
    year: period.year,
    target: "both",
    fromUserId,
    throwIfNoRecipients: false,
  });

  if (
    result.opcoNotifications === 0 &&
    result.partnerNotifications === 0
  ) {
    return {
      status: "skipped",
      reason: "no_missing_reports",
      period,
      opcoNotifications: 0,
      partnerNotifications: 0,
      message: result.message,
    };
  }

  return {
    status: "sent",
    period,
    opcoNotifications: result.opcoNotifications,
    partnerNotifications: result.partnerNotifications,
    message: result.message,
  };
}
