/**
 * UC-07 automatic submission intimations and reminders — cron entry for schedule steps due today.
 * Reads Admin Reminder Settings; sends Dizlee broadcast notifications to OpCo/Partner audiences
 * that still have Missing report lanes for the period (skips orgs that already submitted).
 * Invoke via `/api/admin/cron/submission-reminders` with CRON_SECRET.
 */
import {
  getDueScheduleSteps,
  type DueScheduleStep,
  type ScheduleAudience,
} from "@/lib/admin/notification-schedules.shared";
import {
  SUBMISSION_REMINDERS_JOB_KEY,
  calendarDateUtc,
  cronStepKey,
  tryClaimCronStep,
} from "@/lib/admin/cron-job-ledger";
import { getReminderSettings } from "@/lib/admin/reminder-settings";
import { sendBroadcastNotification } from "@/lib/dizlee/notifications/intimations";
import {
  listReportMonitoringLanes,
  type ReportMonitoringLane,
} from "@/lib/dizlee/reports-monitoring";
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

async function getAllMonitoringLanes(
  month: number,
  year: number,
): Promise<ReportMonitoringLane[]> {
  const firstPage = await listReportMonitoringLanes({
    month,
    year,
    page: 1,
    missing: "any",
    sortBy: "opco",
    sortDir: "asc",
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const lanes = [...firstPage.items];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const next = await listReportMonitoringLanes({
      month,
      year,
      page,
      missing: "any",
      sortBy: "opco",
      sortDir: "asc",
    });
    lanes.push(...next.items);
  }

  return lanes;
}

/** Orgs with ≥1 Missing lane for the period (matches manual missing-report reminders). */
export async function listMissingOrgIdsForPeriod(params: {
  month: number;
  year: number;
  audience: ScheduleAudience;
}): Promise<{ opcoIds: string[]; partnerIds: string[] }> {
  const lanes = await getAllMonitoringLanes(params.month, params.year);
  const includeOpcos =
    params.audience === "opco" || params.audience === "both";
  const includePartners =
    params.audience === "partner" || params.audience === "both";

  const opcoIds = new Set<string>();
  const partnerIds = new Set<string>();

  for (const lane of lanes) {
    if (includeOpcos && lane.opcoReport.status === "Missing") {
      opcoIds.add(lane.opcoId);
    }
    if (includePartners && lane.partnerReport.status === "Missing") {
      partnerIds.add(lane.partnerId);
    }
  }

  return {
    opcoIds: [...opcoIds],
    partnerIds: [...partnerIds],
  };
}

async function fireScheduleStep(params: {
  step: DueScheduleStep;
  period: AutomaticReminderPeriod;
  fromUserId: bigint;
}): Promise<{ opcoNotifications: number; partnerNotifications: number }> {
  const { step, period, fromUserId } = params;
  const { opcoIds, partnerIds } = await listMissingOrgIdsForPeriod({
    month: period.month,
    year: period.year,
    audience: step.audience,
  });

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
      deliveryChannel: "BOTH",
      requireEmailConfigured: false,
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
  let stepsFired = 0;
  let stepsSkippedDuplicate = 0;
  const runDate = calendarDateUtc(now);

  for (const step of dueSteps) {
    const claimed = await tryClaimCronStep({
      jobKey: SUBMISSION_REMINDERS_JOB_KEY,
      runDate,
      stepKey: cronStepKey(step),
      periodYear: period.year,
      periodMonth: period.month,
    });
    if (!claimed) {
      stepsSkippedDuplicate += 1;
      messages.push(
        `${step.kind.toLowerCase()} (day ${step.dayOfMonth} → ${step.audience}): skipped duplicate`,
      );
      continue;
    }

    const result = await fireScheduleStep({ step, period, fromUserId });
    stepsFired += 1;
    opcoNotifications += result.opcoNotifications;
    partnerNotifications += result.partnerNotifications;
    messages.push(
      `${step.kind.toLowerCase()} (day ${step.dayOfMonth} → ${step.audience}): ${result.opcoNotifications + result.partnerNotifications} recipients`,
    );
  }

  if (stepsFired === 0 && stepsSkippedDuplicate > 0) {
    return {
      status: "skipped",
      reason: "no_recipients",
      period,
      opcoNotifications: 0,
      partnerNotifications: 0,
      message: `All due steps already ran today. ${messages.join("; ")}`,
      stepsFired: 0,
    };
  }

  if (opcoNotifications === 0 && partnerNotifications === 0) {
    return {
      status: "skipped",
      reason: "no_recipients",
      period,
      opcoNotifications: 0,
      partnerNotifications: 0,
      message: `Due steps ran but no recipients were notified. ${messages.join("; ")}`,
      stepsFired,
    };
  }

  return {
    status: "sent",
    period,
    opcoNotifications,
    partnerNotifications,
    stepsFired,
    message: `Fired ${stepsFired} schedule step(s). ${messages.join("; ")}`,
  };
}
