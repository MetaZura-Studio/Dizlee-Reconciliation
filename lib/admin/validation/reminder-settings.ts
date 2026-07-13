import { z } from "zod";

import { NOTIFICATION_EVENT_CODES } from "@/lib/admin/notification-schedules.shared";
import { REMINDER_UNITS } from "@/lib/admin/reminder-duration";

const scheduleStepSchema = z.object({
  id: z.string().trim().min(1),
  offsetDays: z.number().int().positive("Offset must be at least 1 day"),
});

const eventScheduleSchema = z.object({
  eventCode: z.enum(NOTIFICATION_EVENT_CODES),
  enabled: z.boolean(),
  dueDayOfMonth: z
    .number()
    .int()
    .min(1, "Due day must be between 1 and 28")
    .max(28, "Due day must be between 1 and 28"),
  intimations: z.array(scheduleStepSchema),
  reminders: z.array(scheduleStepSchema),
});

export const updateReminderSettingsSchema = z.object({
  remindersEnabled: z.boolean(),
  /** Legacy single delay — kept for backward compatibility. */
  reminderValue: z.union([z.number().int().positive(), z.null()]).optional(),
  reminderUnit: z.enum(REMINDER_UNITS).optional().default("days"),
  schedules: z.array(eventScheduleSchema).min(1),
});

export type UpdateReminderSettingsInput = z.infer<
  typeof updateReminderSettingsSchema
>;
