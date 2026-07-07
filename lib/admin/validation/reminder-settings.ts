import { z } from "zod";

import { REMINDER_UNITS } from "@/lib/admin/reminder-duration";

export const updateReminderSettingsSchema = z.object({
  remindersEnabled: z.boolean(),
  reminderValue: z.union([z.number().int().positive(), z.null()]).optional(),
  reminderUnit: z.enum(REMINDER_UNITS),
});

export type UpdateReminderSettingsInput = z.infer<
  typeof updateReminderSettingsSchema
>;
