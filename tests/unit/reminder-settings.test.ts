import { describe, expect, it } from "vitest";

import {
  formatReminderSchedule,
  getReminderDurationMs,
  isReminderPeriodEligible,
} from "@/lib/admin/reminder-duration";
import { updateReminderSettingsSchema } from "@/lib/admin/validation/reminder-settings";

describe("reminder settings validation", () => {
  it("accepts enabled settings with days or weeks", () => {
    expect(
      updateReminderSettingsSchema.safeParse({
        remindersEnabled: true,
        reminderValue: 3,
        reminderUnit: "days",
      }).success,
    ).toBe(true);

    expect(
      updateReminderSettingsSchema.safeParse({
        remindersEnabled: true,
        reminderValue: 1,
        reminderUnit: "weeks",
      }).success,
    ).toBe(true);
  });

  it("allows blank reminder value", () => {
    const result = updateReminderSettingsSchema.safeParse({
      remindersEnabled: false,
      reminderValue: null,
      reminderUnit: "days",
    });

    expect(result.success).toBe(true);
  });
});

describe("reminder duration helpers", () => {
  it("formats schedule labels", () => {
    expect(formatReminderSchedule(3, "days")).toBe("3 days");
    expect(formatReminderSchedule(1, "weeks")).toBe("1 week");
  });

  it("converts days and weeks to milliseconds", () => {
    expect(getReminderDurationMs(3, "days")).toBe(3 * 24 * 60 * 60 * 1000);
    expect(getReminderDurationMs(1, "weeks")).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("checks eligibility from period start", () => {
    const eligible = isReminderPeriodEligible({
      periodYear: 2026,
      periodMonth: 7,
      reminderValue: 3,
      reminderUnit: "days",
      now: new Date("2026-07-04T12:00:00Z"),
    });

    const tooEarly = isReminderPeriodEligible({
      periodYear: 2026,
      periodMonth: 7,
      reminderValue: 3,
      reminderUnit: "days",
      now: new Date("2026-07-03T12:00:00Z"),
    });

    expect(eligible).toBe(true);
    expect(tooEarly).toBe(false);
  });
});
