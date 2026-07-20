import { describe, expect, it } from "vitest";

import {
  getDueScheduleSteps,
  isValidIntimationDay,
  isValidReminderDay,
  parseNotificationScheduleJson,
  triggerDateForStep,
} from "@/lib/admin/notification-schedules.shared";
import { updateReminderSettingsSchema } from "@/lib/admin/validation/reminder-settings";

describe("reminder settings validation", () => {
  it("accepts intimations before due and reminders after due", () => {
    const result = updateReminderSettingsSchema.safeParse({
      remindersEnabled: true,
      reminderUnit: "days",
      schedule: {
        enabled: true,
        dueDayOfMonth: 10,
        intimations: [
          {
            id: "a",
            dayOfMonth: 7,
            templateCode: "REPORT_SUBMISSION",
            audience: "both",
          },
        ],
        reminders: [
          {
            id: "b",
            dayOfMonth: 11,
            templateCode: "REPORT_REMINDER",
            audience: "opco",
          },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects intimations on or after the due day", () => {
    const result = updateReminderSettingsSchema.safeParse({
      remindersEnabled: true,
      schedule: {
        enabled: true,
        dueDayOfMonth: 10,
        intimations: [
          {
            id: "a",
            dayOfMonth: 10,
            templateCode: "REPORT_SUBMISSION",
            audience: "both",
          },
        ],
        reminders: [],
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects reminders on or before the due day", () => {
    const result = updateReminderSettingsSchema.safeParse({
      remindersEnabled: true,
      schedule: {
        enabled: true,
        dueDayOfMonth: 10,
        intimations: [],
        reminders: [
          {
            id: "b",
            dayOfMonth: 9,
            templateCode: "REPORT_REMINDER",
            audience: "both",
          },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects steps without a template code", () => {
    const result = updateReminderSettingsSchema.safeParse({
      remindersEnabled: true,
      schedule: {
        enabled: true,
        dueDayOfMonth: 10,
        intimations: [{ id: "a", dayOfMonth: 7, audience: "both" }],
        reminders: [],
      },
    });

    expect(result.success).toBe(false);
  });
});

describe("notification schedule helpers", () => {
  it("validates intimation and reminder day bounds against due day", () => {
    expect(isValidIntimationDay(9, 10)).toBe(true);
    expect(isValidIntimationDay(10, 10)).toBe(false);
    expect(isValidIntimationDay(11, 10)).toBe(false);
    expect(isValidReminderDay(11, 10)).toBe(true);
    expect(isValidReminderDay(10, 10)).toBe(false);
    expect(isValidReminderDay(9, 10)).toBe(false);
  });

  it("builds trigger dates from day of month", () => {
    const trigger = triggerDateForStep({
      year: 2026,
      month: 7,
      dayOfMonth: 7,
    });

    expect(trigger.getFullYear()).toBe(2026);
    expect(trigger.getMonth()).toBe(6);
    expect(trigger.getDate()).toBe(7);
  });

  it("returns due steps for today", () => {
    const schedule = parseNotificationScheduleJson(
      JSON.stringify({
        enabled: true,
        dueDayOfMonth: 10,
        intimations: [{ id: "i1", dayOfMonth: 7 }],
        reminders: [{ id: "r1", dayOfMonth: 11 }],
      }),
    );

    expect(schedule.intimations[0]?.dayOfMonth).toBe(7);
    expect(schedule.intimations[0]?.audience).toBe("both");

    const due = getDueScheduleSteps({
      schedule,
      now: new Date(2026, 6, 7, 12, 0, 0),
    });

    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({
      kind: "INTIMATION",
      dayOfMonth: 7,
      templateCode: "REPORT_SUBMISSION",
      audience: "both",
    });
  });

  it("migrates legacy offsetDays into dayOfMonth relative to due day", () => {
    const schedule = parseNotificationScheduleJson(
      JSON.stringify({
        enabled: true,
        dueDayOfMonth: 10,
        intimations: [{ id: "i1", offsetDays: 3, templateCode: "REPORT_SUBMISSION" }],
        reminders: [{ id: "r1", offsetDays: 1, templateCode: "REPORT_REMINDER" }],
      }),
    );

    expect(schedule.intimations[0]?.dayOfMonth).toBe(7);
    expect(schedule.reminders[0]?.dayOfMonth).toBe(11);
  });

  it("clamps invalid days when parsing", () => {
    const schedule = parseNotificationScheduleJson(
      JSON.stringify({
        enabled: true,
        dueDayOfMonth: 10,
        intimations: [
          {
            id: "i1",
            dayOfMonth: 15,
            templateCode: "CUSTOM_REPORT_INTIMATION",
            audience: "partner",
          },
        ],
        reminders: [
          {
            id: "r1",
            dayOfMonth: 5,
            templateCode: "REPORT_REMINDER",
            audience: "both",
          },
        ],
      }),
    );

    expect(schedule.intimations[0]?.dayOfMonth).toBeLessThan(10);
    expect(schedule.reminders[0]?.dayOfMonth).toBeGreaterThan(10);
  });
});
