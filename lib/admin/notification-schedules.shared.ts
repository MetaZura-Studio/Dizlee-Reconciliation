export const SCHEDULE_STEP_KINDS = ["INTIMATION", "REMINDER"] as const;
export type ScheduleStepKind = (typeof SCHEDULE_STEP_KINDS)[number];

export const SCHEDULE_AUDIENCES = ["opco", "partner", "both"] as const;
export type ScheduleAudience = (typeof SCHEDULE_AUDIENCES)[number];

export type ScheduleStep = {
  /** Stable id for UI lists */
  id: string;
  /**
   * Calendar day of month this step fires (1–28).
   * Intimations must be before dueDayOfMonth; reminders after.
   */
  dayOfMonth: number;
  /** notification_templates.code used when this step fires */
  templateCode: string;
  /** Who receives this step */
  audience: ScheduleAudience;
};

export type NotificationSchedule = {
  enabled: boolean;
  /** Calendar day of month for the due date (1–28). */
  dueDayOfMonth: number;
  intimations: ScheduleStep[];
  reminders: ScheduleStep[];
};

export type DueScheduleStep = {
  kind: ScheduleStepKind;
  dayOfMonth: number;
  dueDayOfMonth: number;
  triggerDate: string;
  templateCode: string;
  audience: ScheduleAudience;
};

export type ScheduleTemplateOption = {
  code: string;
  name: string;
  category: "INTIMATION" | "REMINDER";
};

export function isScheduleAudience(value: string): value is ScheduleAudience {
  return SCHEDULE_AUDIENCES.includes(value as ScheduleAudience);
}

export function audienceLabel(audience: ScheduleAudience): string {
  switch (audience) {
    case "opco":
      return "OpCo only";
    case "partner":
      return "Partner only";
    case "both":
      return "OpCo and Partner";
  }
}

/** Default template when a step has no templateCode saved yet. */
export function defaultTemplateForKind(kind: ScheduleStepKind): string {
  return kind === "INTIMATION" ? "REPORT_SUBMISSION" : "REPORT_REMINDER";
}

/** Latest day an intimation may use for a given due day (strictly before due). */
export function maxIntimationDay(dueDayOfMonth: number): number {
  return Math.max(0, Math.min(28, dueDayOfMonth) - 1);
}

/** Earliest day a reminder may use for a given due day (strictly after due). */
export function minReminderDay(dueDayOfMonth: number): number {
  return Math.min(29, Math.max(1, dueDayOfMonth) + 1);
}

export function canAddIntimation(dueDayOfMonth: number): boolean {
  return maxIntimationDay(dueDayOfMonth) >= 1;
}

export function canAddReminder(dueDayOfMonth: number): boolean {
  return minReminderDay(dueDayOfMonth) <= 28;
}

export function defaultIntimationDay(dueDayOfMonth: number): number {
  const max = maxIntimationDay(dueDayOfMonth);
  if (max < 1) {
    return 1;
  }
  return Math.max(1, Math.min(max, dueDayOfMonth - 3));
}

export function defaultReminderDay(dueDayOfMonth: number): number {
  const min = minReminderDay(dueDayOfMonth);
  if (min > 28) {
    return 28;
  }
  return Math.min(28, Math.max(min, dueDayOfMonth + 1));
}

export function isValidIntimationDay(
  dayOfMonth: number,
  dueDayOfMonth: number,
): boolean {
  return (
    Number.isInteger(dayOfMonth) &&
    dayOfMonth >= 1 &&
    dayOfMonth <= maxIntimationDay(dueDayOfMonth)
  );
}

export function isValidReminderDay(
  dayOfMonth: number,
  dueDayOfMonth: number,
): boolean {
  return (
    Number.isInteger(dayOfMonth) &&
    dayOfMonth >= minReminderDay(dueDayOfMonth) &&
    dayOfMonth <= 28
  );
}

function normalizeAudience(value: unknown): ScheduleAudience {
  if (typeof value === "string" && isScheduleAudience(value)) {
    return value;
  }
  return "both";
}

function clampDay(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}

/**
 * Resolve dayOfMonth from stored step.
 * Supports legacy `offsetDays` by converting relative to due day.
 */
function resolveDayOfMonth(
  step: {
    dayOfMonth?: unknown;
    offsetDays?: unknown;
  },
  kind: ScheduleStepKind,
  dueDayOfMonth: number,
): number {
  if (typeof step.dayOfMonth === "number" && step.dayOfMonth >= 1) {
    if (kind === "INTIMATION") {
      return clampDay(step.dayOfMonth, 1, Math.max(1, maxIntimationDay(dueDayOfMonth)));
    }
    return clampDay(
      step.dayOfMonth,
      Math.min(28, minReminderDay(dueDayOfMonth)),
      28,
    );
  }

  if (typeof step.offsetDays === "number" && step.offsetDays >= 1) {
    if (kind === "INTIMATION") {
      return clampDay(
        dueDayOfMonth - Math.floor(step.offsetDays),
        1,
        Math.max(1, maxIntimationDay(dueDayOfMonth)),
      );
    }
    return clampDay(
      dueDayOfMonth + Math.floor(step.offsetDays),
      Math.min(28, minReminderDay(dueDayOfMonth)),
      28,
    );
  }

  return kind === "INTIMATION"
    ? defaultIntimationDay(dueDayOfMonth)
    : defaultReminderDay(dueDayOfMonth);
}

function normalizeStep(
  step: {
    id: string;
    dayOfMonth?: number;
    offsetDays?: number;
    templateCode?: string;
    audience?: string;
  },
  kind: ScheduleStepKind,
  dueDayOfMonth: number,
): ScheduleStep | null {
  // Drop steps that cannot exist for this due day (e.g. intimation when due is 1)
  if (kind === "INTIMATION" && !canAddIntimation(dueDayOfMonth)) {
    return null;
  }
  if (kind === "REMINDER" && !canAddReminder(dueDayOfMonth)) {
    return null;
  }

  const templateCode =
    typeof step.templateCode === "string" && step.templateCode.trim()
      ? step.templateCode.trim()
      : defaultTemplateForKind(kind);

  return {
    id: step.id,
    dayOfMonth: resolveDayOfMonth(step, kind, dueDayOfMonth),
    templateCode,
    audience: normalizeAudience(step.audience),
  };
}

/** Clamp existing steps when the due day changes. */
export function clampScheduleToDueDay(
  schedule: NotificationSchedule,
): NotificationSchedule {
  const due = schedule.dueDayOfMonth;
  return {
    ...schedule,
    intimations: schedule.intimations
      .map((step) => normalizeStep(step, "INTIMATION", due))
      .filter((step): step is ScheduleStep => step !== null)
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth),
    reminders: schedule.reminders
      .map((step) => normalizeStep(step, "REMINDER", due))
      .filter((step): step is ScheduleStep => step !== null)
      .sort((a, b) => a.dayOfMonth - b.dayOfMonth),
  };
}

export function defaultNotificationSchedule(): NotificationSchedule {
  return {
    enabled: true,
    dueDayOfMonth: 10,
    intimations: [
      {
        id: "intimation-1",
        dayOfMonth: 7,
        templateCode: "REPORT_SUBMISSION",
        audience: "both",
      },
      {
        id: "intimation-2",
        dayOfMonth: 9,
        templateCode: "REPORT_SUBMISSION",
        audience: "both",
      },
    ],
    reminders: [
      {
        id: "reminder-1",
        dayOfMonth: 11,
        templateCode: "REPORT_REMINDER",
        audience: "both",
      },
      {
        id: "reminder-2",
        dayOfMonth: 13,
        templateCode: "REPORT_REMINDER",
        audience: "both",
      },
    ],
  };
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
  dayOfMonth: number;
}): Date {
  const day = Math.min(Math.max(params.dayOfMonth, 1), 28);
  return new Date(params.year, params.month - 1, day);
}

/**
 * Returns schedule steps whose trigger calendar day matches `now`
 * for the current reporting period (month/year of `now`).
 * Skips steps that violate before/after due-day rules.
 */
export function getDueScheduleSteps(params: {
  schedule: NotificationSchedule;
  now?: Date;
}): DueScheduleStep[] {
  const now = params.now ?? new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const todayKey = toDateKey(now);
  const due: DueScheduleStep[] = [];
  const schedule = params.schedule;

  if (!schedule.enabled) {
    return due;
  }

  for (const step of schedule.intimations) {
    if (!isValidIntimationDay(step.dayOfMonth, schedule.dueDayOfMonth)) {
      continue;
    }
    const trigger = triggerDateForStep({
      year,
      month,
      dayOfMonth: step.dayOfMonth,
    });
    if (toDateKey(trigger) === todayKey) {
      due.push({
        kind: "INTIMATION",
        dayOfMonth: step.dayOfMonth,
        dueDayOfMonth: schedule.dueDayOfMonth,
        triggerDate: todayKey,
        templateCode: step.templateCode || defaultTemplateForKind("INTIMATION"),
        audience: step.audience,
      });
    }
  }

  for (const step of schedule.reminders) {
    if (!isValidReminderDay(step.dayOfMonth, schedule.dueDayOfMonth)) {
      continue;
    }
    const trigger = triggerDateForStep({
      year,
      month,
      dayOfMonth: step.dayOfMonth,
    });
    if (toDateKey(trigger) === todayKey) {
      due.push({
        kind: "REMINDER",
        dayOfMonth: step.dayOfMonth,
        dueDayOfMonth: schedule.dueDayOfMonth,
        triggerDate: todayKey,
        templateCode: step.templateCode || defaultTemplateForKind("REMINDER"),
        audience: step.audience,
      });
    }
  }

  return due;
}

function isRawStep(step: unknown): step is {
  id: string;
  dayOfMonth?: number;
  offsetDays?: number;
  templateCode?: string;
  audience?: string;
} {
  if (!step || typeof step !== "object") {
    return false;
  }
  const row = step as {
    id?: unknown;
    dayOfMonth?: unknown;
    offsetDays?: unknown;
  };
  if (typeof row.id !== "string") {
    return false;
  }
  const hasDay =
    typeof row.dayOfMonth === "number" && row.dayOfMonth >= 1;
  const hasOffset =
    typeof row.offsetDays === "number" && row.offsetDays >= 1;
  return hasDay || hasOffset;
}

function scheduleFromParts(row: {
  enabled?: boolean;
  dueDayOfMonth?: number;
  intimations?: unknown;
  reminders?: unknown;
}): NotificationSchedule {
  const dueDayOfMonth =
    typeof row.dueDayOfMonth === "number" &&
    row.dueDayOfMonth >= 1 &&
    row.dueDayOfMonth <= 28
      ? row.dueDayOfMonth
      : 10;

  return clampScheduleToDueDay({
    enabled: Boolean(row.enabled ?? true),
    dueDayOfMonth,
    intimations: Array.isArray(row.intimations)
      ? row.intimations
          .filter(isRawStep)
          .map((step) => normalizeStep(step, "INTIMATION", dueDayOfMonth))
          .filter((step): step is ScheduleStep => step !== null)
      : [],
    reminders: Array.isArray(row.reminders)
      ? row.reminders
          .filter(isRawStep)
          .map((step) => normalizeStep(step, "REMINDER", dueDayOfMonth))
          .filter((step): step is ScheduleStep => step !== null)
      : [],
  });
}

/**
 * Parses stored JSON. Supports:
 * - Current shape: single schedule with dayOfMonth steps
 * - Legacy offsetDays steps (converted using due day)
 * - Legacy array of per-event schedules (REPORT/INVOICE)
 */
export function parseNotificationScheduleJson(
  raw: string | null | undefined,
): NotificationSchedule {
  if (!raw?.trim()) {
    return defaultNotificationSchedule();
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const row = parsed as Partial<NotificationSchedule> & {
        eventCode?: string;
      };
      if ("intimations" in row || "reminders" in row || "dueDayOfMonth" in row) {
        return scheduleFromParts(row);
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      const rows = parsed.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      );
      const preferred =
        rows.find((row) => row.eventCode === "REPORT") ??
        rows.find((row) => row.enabled === true) ??
        rows[0];

      if (preferred) {
        return scheduleFromParts(preferred);
      }
    }

    return defaultNotificationSchedule();
  } catch {
    return defaultNotificationSchedule();
  }
}

/** @deprecated Use parseNotificationScheduleJson */
export const parseNotificationSchedulesJson = (
  raw: string | null | undefined,
): NotificationSchedule => parseNotificationScheduleJson(raw);

/** @deprecated Use defaultNotificationSchedule */
export const defaultNotificationSchedules = (): NotificationSchedule[] => [
  defaultNotificationSchedule(),
];
