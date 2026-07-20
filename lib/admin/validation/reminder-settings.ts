import { z } from "zod";

import {
  isValidIntimationDay,
  isValidReminderDay,
  SCHEDULE_AUDIENCES,
} from "@/lib/admin/notification-schedules.shared";
import { REMINDER_UNITS } from "@/lib/admin/reminder-duration";

const scheduleStepBaseSchema = z.object({
  id: z.string().trim().min(1),
  dayOfMonth: z
    .number()
    .int()
    .min(1, "Day must be between 1 and 28")
    .max(28, "Day must be between 1 and 28"),
  templateCode: z
    .string()
    .trim()
    .min(1, "Select a message template for each step"),
  audience: z.enum(SCHEDULE_AUDIENCES),
});

const notificationScheduleSchema = z
  .object({
    enabled: z.boolean(),
    dueDayOfMonth: z
      .number()
      .int()
      .min(1, "Due day must be between 1 and 28")
      .max(28, "Due day must be between 1 and 28"),
    intimations: z.array(scheduleStepBaseSchema),
    reminders: z.array(scheduleStepBaseSchema),
  })
  .superRefine((schedule, ctx) => {
    const due = schedule.dueDayOfMonth;

    if (due <= 1 && schedule.intimations.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["intimations"],
        message:
          "Due day is the 1st — there is no earlier day for intimations. Raise the due day or remove intimations.",
      });
    }

    if (due >= 28 && schedule.reminders.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reminders"],
        message:
          "Due day is the 28th — there is no later day for reminders. Lower the due day or remove reminders.",
      });
    }

    schedule.intimations.forEach((step, index) => {
      if (!isValidIntimationDay(step.dayOfMonth, due)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["intimations", index, "dayOfMonth"],
          message: `Intimation must be sent before the due day (choose day 1–${due - 1}).`,
        });
      }
    });

    schedule.reminders.forEach((step, index) => {
      if (!isValidReminderDay(step.dayOfMonth, due)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["reminders", index, "dayOfMonth"],
          message: `Reminder must be sent after the due day (choose day ${due + 1}–28).`,
        });
      }
    });
  });

export const updateReminderSettingsSchema = z.object({
  remindersEnabled: z.boolean(),
  /** Legacy single delay — kept for backward compatibility. */
  reminderValue: z.union([z.number().int().positive(), z.null()]).optional(),
  reminderUnit: z.enum(REMINDER_UNITS).optional().default("days"),
  schedule: notificationScheduleSchema,
});

export type UpdateReminderSettingsInput = z.infer<
  typeof updateReminderSettingsSchema
>;
