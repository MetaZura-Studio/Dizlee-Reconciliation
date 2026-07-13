import { describe, expect, it } from "vitest";

import {
  getDueScheduleSteps,
  parseNotificationSchedulesJson,
  triggerDateForStep,
} from "@/lib/admin/notification-schedules.shared";
import { updateReminderSettingsSchema } from "@/lib/admin/validation/reminder-settings";

describe("reminder settings validation", () => {
  it("accepts schedules with intimations and reminders", () => {
    const result = updateReminderSettingsSchema.safeParse({
      remindersEnabled: true,
      reminderUnit: "days",
      schedules: [
        {
          eventCode: "REPORT",
          enabled: true,
          dueDayOfMonth: 10,
          intimations: [{ id: "a", offsetDays: 3 }],
          reminders: [{ id: "b", offsetDays: 1 }],
        },
        {
          eventCode: "INVOICE",
          enabled: false,
          dueDayOfMonth: 15,
          intimations: [],
          reminders: [],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid due day", () => {
    const result = updateReminderSettingsSchema.safeParse({
      remindersEnabled: true,
      schedules: [
        {
          eventCode: "REPORT",
          enabled: true,
          dueDayOfMonth: 31,
          intimations: [],
          reminders: [],
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("notification schedule helpers", () => {
  it("computes intimation and reminder trigger dates from due day", () => {
    const intimation = triggerDateForStep({
      year: 2026,
      month: 7,
      dueDayOfMonth: 10,
      kind: "INTIMATION",
      offsetDays: 3,
    });
    const reminder = triggerDateForStep({
      year: 2026,
      month: 7,
      dueDayOfMonth: 10,
      kind: "REMINDER",
      offsetDays: 2,
    });

    expect(intimation.getFullYear()).toBe(2026);
    expect(intimation.getMonth()).toBe(6);
    expect(intimation.getDate()).toBe(7);
    expect(reminder.getDate()).toBe(12);
  });

  it("returns due steps for today", () => {
    const schedules = parseNotificationSchedulesJson(
      JSON.stringify([
        {
          eventCode: "REPORT",
          enabled: true,
          dueDayOfMonth: 10,
          intimations: [{ id: "i1", offsetDays: 3 }],
          reminders: [{ id: "r1", offsetDays: 1 }],
        },
        {
          eventCode: "INVOICE",
          enabled: true,
          dueDayOfMonth: 15,
          intimations: [],
          reminders: [],
        },
      ]),
    );

    const due = getDueScheduleSteps({
      schedules,
      now: new Date(2026, 6, 7, 12, 0, 0),
    });

    expect(due).toHaveLength(1);
    expect(due[0]).toMatchObject({
      eventCode: "REPORT",
      kind: "INTIMATION",
      offsetDays: 3,
      templateCode: "REPORT_SUBMISSION",
    });
  });
});
