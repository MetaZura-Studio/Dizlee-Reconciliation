export const REMINDER_UNITS = ["days", "weeks"] as const;

export type ReminderUnit = (typeof REMINDER_UNITS)[number];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isReminderUnit(value: string): value is ReminderUnit {
  return REMINDER_UNITS.includes(value as ReminderUnit);
}

export function formatReminderSchedule(
  value: number | null,
  unit: string | null,
): string | null {
  if (value === null || value === undefined || !unit) {
    return null;
  }
  const label = value === 1 ? unit.slice(0, -1) : unit;
  return `${value} ${label}`;
}

/** Calendar duration after period start for UC-07 eligibility checks. */
export function getReminderDurationMs(
  value: number | null,
  unit: string | null,
): number | null {
  if (value === null || value === undefined || value < 1 || !unit) {
    return null;
  }

  if (unit === "days") {
    return value * MS_PER_DAY;
  }

  if (unit === "weeks") {
    return value * 7 * MS_PER_DAY;
  }

  return null;
}

export function isReminderPeriodEligible(params: {
  periodYear: number;
  periodMonth: number;
  reminderValue: number | null;
  reminderUnit: string | null;
  now?: Date;
}): boolean {
  const durationMs = getReminderDurationMs(
    params.reminderValue,
    params.reminderUnit,
  );
  if (durationMs === null) {
    return false;
  }

  const now = params.now ?? new Date();
  const periodStart = new Date(params.periodYear, params.periodMonth - 1, 1);
  return now.getTime() >= periodStart.getTime() + durationMs;
}
