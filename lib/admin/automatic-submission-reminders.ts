/**
 * UC-07 — Automatic submission intimations & reminders (cron-ready).
 *
 * External scheduler example:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     http://localhost:3000/api/admin/cron/submission-reminders
 *
 * Fires schedule steps whose trigger day is today (per Admin → Reminder Settings).
 */

import {
  getDueScheduleSteps,
  type DueScheduleStep,
  type ScheduleAudience,
} from "@/lib/admin/notification-schedules.shared";
import { getReminderSettings } from "@/lib/admin/reminder-settings";
import { sendBroadcastNotification } from "@/lib/dizlee/notifications/intimations";
import { prisma } from "@/lib/prisma";

export type AutomaticReminderSkipReason =
  | "disabled"
  | "no_steps_due"
  | "no_recipients";

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
      stepsFired?: number;
    }
  | {
      status: "sent";
      period: AutomaticReminderPeriod;
      opcoNotifications: number;
      partnerNotifications: number;
      message: string;
      stepsFired: number;
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

async function listOrgIdsForAudience(audience: ScheduleAudience): Promise<{
  opcoIds: string[];
  partnerIds: string[];
}> {
  const [opcos, partners] = await Promise.all([
    audience === "partner"
      ? Promise.resolve([])
      : prisma.opco.findMany({
          where: { isDeleted: false },
          select: { id: true },
          orderBy: { name: "asc" },
        }),
    audience === "opco"
      ? Promise.resolve([])
      : prisma.partner.findMany({
          where: { isDeleted: false },
          select: { id: true },
          orderBy: { name: "asc" },
        }),
  ]);

  return {
    opcoIds: opcos.map((row) => row.id.toString()),
    partnerIds: partners.map((row) => row.id.toString()),
  };
}

async function fireScheduleStep(params: {
  step: DueScheduleStep;
  period: AutomaticReminderPeriod;
  fromUserId: bigint;
}): Promise<{ opcoNotifications: number; partnerNotifications: number }> {
  const { step, period, fromUserId } = params;
  const { opcoIds, partnerIds } = await listOrgIdsForAudience(step.audience);

  if (opcoIds.length === 0 && partnerIds.length === 0) {
    return { opcoNotifications: 0, partnerNotifications: 0 };
  }

  await sendBroadcastNotification({
    fromUserId: fromUserId.toString(),
    input: {
      audience: step.audience,
      messageSource: step.templateCode,
      month: period.month,
      year: period.year,
      opcoIds,
      partnerIds,
      priority: "NORMAL",
    },
  });

  return {
    opcoNotifications: opcoIds.length,
    partnerNotifications: partnerIds.length,
  };
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

  const dueSteps = getDueScheduleSteps({
    schedule: settings.schedule,
    now,
  });

  if (dueSteps.length === 0) {
    return {
      status: "skipped",
      reason: "no_steps_due",
      period,
      opcoNotifications: 0,
      partnerNotifications: 0,
      message: "No intimation or reminder steps are scheduled for today.",
      stepsFired: 0,
    };
  }

  const fromUserId = await resolveAutomaticReminderActorId(params?.fromUserId);
  let opcoNotifications = 0;
  let partnerNotifications = 0;
  const messages: string[] = [];

  for (const step of dueSteps) {
    const result = await fireScheduleStep({ step, period, fromUserId });
    opcoNotifications += result.opcoNotifications;
    partnerNotifications += result.partnerNotifications;
    messages.push(
      `${step.kind.toLowerCase()} (day ${step.dayOfMonth} → ${step.audience}): ${result.opcoNotifications + result.partnerNotifications} recipients`,
    );
  }

  if (opcoNotifications === 0 && partnerNotifications === 0) {
    return {
      status: "skipped",
      reason: "no_recipients",
      period,
      opcoNotifications: 0,
      partnerNotifications: 0,
      message: `Due steps ran but no recipients were notified. ${messages.join("; ")}`,
      stepsFired: dueSteps.length,
    };
  }

  return {
    status: "sent",
    period,
    opcoNotifications,
    partnerNotifications,
    stepsFired: dueSteps.length,
    message: `Fired ${dueSteps.length} schedule step(s). ${messages.join("; ")}`,
  };
}
