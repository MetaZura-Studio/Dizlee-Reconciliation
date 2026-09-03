/**
 * Idempotent cron step claims — unique (job, calendar day, step) prevents double-sends.
 */

import { prisma } from "@/lib/prisma";
import type { DueScheduleStep } from "@/lib/admin/notification-schedules.shared";

export const SUBMISSION_REMINDERS_JOB_KEY = "submission-reminders";

export function cronStepKey(step: DueScheduleStep): string {
  return [
    step.kind,
    String(step.dayOfMonth),
    step.audience,
    step.templateCode,
    step.triggerDate,
  ].join(":");
}

export function calendarDateUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Try to claim a cron step for today. Returns false if already claimed (unique conflict).
 */
export async function tryClaimCronStep(params: {
  jobKey: string;
  runDate: string;
  stepKey: string;
  periodYear: number;
  periodMonth: number;
}): Promise<boolean> {
  try {
    await prisma.cronJobRun.create({
      data: {
        jobKey: params.jobKey,
        runDate: params.runDate,
        stepKey: params.stepKey.slice(0, 255),
        periodYear: params.periodYear,
        periodMonth: params.periodMonth,
      },
    });
    return true;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "";
    if (code === "P2002") {
      return false;
    }
    throw error;
  }
}
