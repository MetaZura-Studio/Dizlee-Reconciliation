import type { BroadcastTemplateCode } from "@/lib/dizlee/notifications/broadcast.shared";

export const NOTIFICATION_EVENT_CODES = ["REPORT", "INVOICE"] as const;
export type NotificationEventCode = (typeof NOTIFICATION_EVENT_CODES)[number];

export const SCHEDULE_STEP_KINDS = ["INTIMATION", "REMINDER"] as const;
export type ScheduleStepKind = (typeof SCHEDULE_STEP_KINDS)[number];

export type ScheduleStep = {
  /** Stable id for UI lists */
  id: string;
  /** Days before due (intimation) or after due (reminder). Must be >= 1. */
  offsetDays: number;
};

export type EventSchedule = {
  eventCode: NotificationEventCode;
  enabled: boolean;
  /** Calendar day of month for the due date (1–28). */
  dueDayOfMonth: number;
  intimations: ScheduleStep[];
  reminders: ScheduleStep[];
};

export type NotificationSchedules = EventSchedule[];

export type DueScheduleStep = {
  eventCode: NotificationEventCode;
  kind: ScheduleStepKind;
  offsetDays: number;
  dueDayOfMonth: number;
  triggerDate: string;
  templateCode: BroadcastTemplateCode;
};

export function isNotificationEventCode(
  value: string,
): value is NotificationEventCode {
  return NOTIFICATION_EVENT_CODES.includes(value as NotificationEventCode);
}

export function templateForEventStep(
  eventCode: NotificationEventCode,
  kind: ScheduleStepKind,
): BroadcastTemplateCode {
  if (eventCode === "REPORT") {
    return kind === "INTIMATION" ? "REPORT_SUBMISSION" : "REPORT_REMINDER";
  }
  return kind === "INTIMATION" ? "INVOICE_SUBMISSION" : "INVOICE_REMINDER";
}

export function eventLabel(eventCode: NotificationEventCode): string {
  return eventCode === "REPORT" ? "Report submission" : "Invoice submission";
}

export function defaultNotificationSchedules(): NotificationSchedules {
  return [
    {
      eventCode: "REPORT",
      enabled: true,
      dueDayOfMonth: 10,
      intimations: [
        { id: "report-intimation-1", offsetDays: 3 },
        { id: "report-intimation-2", offsetDays: 1 },
      ],
      reminders: [
        { id: "report-reminder-1", offsetDays: 1 },
        { id: "report-reminder-2", offsetDays: 3 },
      ],
    },
    {
      eventCode: "INVOICE",
      enabled: true,
      dueDayOfMonth: 15,
      intimations: [
        { id: "invoice-intimation-1", offsetDays: 3 },
        { id: "invoice-intimation-2", offsetDays: 1 },
      ],
      reminders: [
        { id: "invoice-reminder-1", offsetDays: 1 },
        { id: "invoice-reminder-2", offsetDays: 3 },
      ],
    },
  ];
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Build the due date for a period month/year using dueDayOfMonth (clamped to month length, max 28). */
export function dueDateForPeriod(params: {
  year: number;
  month: number;
  dueDayOfMonth: number;
}): Date {
  const day = Math.min(Math.max(params.dueDayOfMonth, 1), 28);
  return new Date(params.year, params.month - 1, day);
}

export function triggerDateForStep(params: {
  year: number;
  month: number;
  dueDayOfMonth: number;
  kind: ScheduleStepKind;
  offsetDays: number;
}): Date {
  const due = dueDateForPeriod(params);
  const ms = params.offsetDays * 24 * 60 * 60 * 1000;
  if (params.kind === "INTIMATION") {
    return new Date(due.getTime() - ms);
  }
  return new Date(due.getTime() + ms);
}

/**
 * Returns schedule steps whose trigger calendar day matches `now`
 * for the current reporting period (month/year of `now`).
 */
export function getDueScheduleSteps(params: {
  schedules: NotificationSchedules;
  now?: Date;
}): DueScheduleStep[] {
  const now = params.now ?? new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayKey = toDateKey(now);
  const due: DueScheduleStep[] = [];

  for (const schedule of params.schedules) {
    if (!schedule.enabled) {
      continue;
    }

    for (const step of schedule.intimations) {
      const trigger = triggerDateForStep({
        year,
        month,
        dueDayOfMonth: schedule.dueDayOfMonth,
        kind: "INTIMATION",
        offsetDays: step.offsetDays,
      });
      if (toDateKey(trigger) === todayKey) {
        due.push({
          eventCode: schedule.eventCode,
          kind: "INTIMATION",
          offsetDays: step.offsetDays,
          dueDayOfMonth: schedule.dueDayOfMonth,
          triggerDate: todayKey,
          templateCode: templateForEventStep(schedule.eventCode, "INTIMATION"),
        });
      }
    }

    for (const step of schedule.reminders) {
      const trigger = triggerDateForStep({
        year,
        month,
        dueDayOfMonth: schedule.dueDayOfMonth,
        kind: "REMINDER",
        offsetDays: step.offsetDays,
      });
      if (toDateKey(trigger) === todayKey) {
        due.push({
          eventCode: schedule.eventCode,
          kind: "REMINDER",
          offsetDays: step.offsetDays,
          dueDayOfMonth: schedule.dueDayOfMonth,
          triggerDate: todayKey,
          templateCode: templateForEventStep(schedule.eventCode, "REMINDER"),
        });
      }
    }
  }

  return due;
}

export function parseNotificationSchedulesJson(
  raw: string | null | undefined,
): NotificationSchedules {
  if (!raw?.trim()) {
    return defaultNotificationSchedules();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return defaultNotificationSchedules();
    }

    const schedules: NotificationSchedules = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const row = item as Partial<EventSchedule>;
      if (!row.eventCode || !isNotificationEventCode(row.eventCode)) {
        continue;
      }
      schedules.push({
        eventCode: row.eventCode,
        enabled: Boolean(row.enabled),
        dueDayOfMonth:
          typeof row.dueDayOfMonth === "number" &&
          row.dueDayOfMonth >= 1 &&
          row.dueDayOfMonth <= 28
            ? row.dueDayOfMonth
            : 10,
        intimations: Array.isArray(row.intimations)
          ? row.intimations
              .filter(
                (step): step is ScheduleStep =>
                  Boolean(step) &&
                  typeof step.id === "string" &&
                  typeof step.offsetDays === "number" &&
                  step.offsetDays >= 1,
              )
              .map((step) => ({
                id: step.id,
                offsetDays: Math.floor(step.offsetDays),
              }))
          : [],
        reminders: Array.isArray(row.reminders)
          ? row.reminders
              .filter(
                (step): step is ScheduleStep =>
                  Boolean(step) &&
                  typeof step.id === "string" &&
                  typeof step.offsetDays === "number" &&
                  step.offsetDays >= 1,
              )
              .map((step) => ({
                id: step.id,
                offsetDays: Math.floor(step.offsetDays),
              }))
          : [],
      });
    }

    for (const code of NOTIFICATION_EVENT_CODES) {
      if (!schedules.some((schedule) => schedule.eventCode === code)) {
        const fallback = defaultNotificationSchedules().find(
          (schedule) => schedule.eventCode === code,
        );
        if (fallback) {
          schedules.push(fallback);
        }
      }
    }

    return schedules.sort((a, b) => a.eventCode.localeCompare(b.eventCode));
  } catch {
    return defaultNotificationSchedules();
  }
}
