import { writeSettingsAuditLog } from "@/lib/admin/audit";
import {
  defaultNotificationSchedules,
  parseNotificationSchedulesJson,
  type NotificationSchedules,
} from "@/lib/admin/notification-schedules.shared";
import { isReminderUnit } from "@/lib/admin/reminder-duration";
import {
  updateReminderSettingsSchema,
  type UpdateReminderSettingsInput,
} from "@/lib/admin/validation/reminder-settings";
import { prisma } from "@/lib/prisma";

export type ReminderSettingsView = {
  remindersEnabled: boolean;
  reminderValue: number | null;
  reminderUnit: string | null;
  schedules: NotificationSchedules;
};

export class ReminderSettingsError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReminderSettingsError";
    this.status = status;
  }
}

function mapSettingsRow(row: {
  remindersEnabled: boolean;
  reminderValue: number | null;
  reminderUnit: string | null;
  notificationSchedulesJson: string | null;
}): ReminderSettingsView {
  return {
    remindersEnabled: row.remindersEnabled,
    reminderValue: row.reminderValue,
    reminderUnit:
      row.reminderUnit && isReminderUnit(row.reminderUnit)
        ? row.reminderUnit
        : "days",
    schedules: parseNotificationSchedulesJson(row.notificationSchedulesJson),
  };
}

export async function getReminderSettings(): Promise<ReminderSettingsView> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: {
      remindersEnabled: true,
      reminderValue: true,
      reminderUnit: true,
      notificationSchedulesJson: true,
    },
  });

  if (!settings) {
    throw new ReminderSettingsError(
      "Application settings could not be loaded.",
      500,
    );
  }

  return mapSettingsRow(settings);
}

export async function updateReminderSettings(
  rawInput: UpdateReminderSettingsInput,
  actorUserId: bigint,
): Promise<ReminderSettingsView> {
  const parsed = updateReminderSettingsSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new ReminderSettingsError(
      parsed.error.issues[0]?.message ?? "Invalid input",
    );
  }

  const schedulesJson = JSON.stringify(parsed.data.schedules);

  const updated = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      remindersEnabled: parsed.data.remindersEnabled,
      reminderValue: parsed.data.reminderValue ?? null,
      reminderUnit: parsed.data.reminderUnit ?? "days",
      notificationSchedulesJson: schedulesJson,
    },
    update: {
      remindersEnabled: parsed.data.remindersEnabled,
      reminderValue: parsed.data.reminderValue ?? null,
      reminderUnit: parsed.data.reminderUnit ?? "days",
      notificationSchedulesJson: schedulesJson,
    },
    select: {
      remindersEnabled: true,
      reminderValue: true,
      reminderUnit: true,
      notificationSchedulesJson: true,
    },
  });

  await writeSettingsAuditLog({
    actorUserId,
    action: "SETTINGS_REMINDERS_UPDATED",
    message: "Reminder settings updated.",
    metadata: {
      remindersEnabled: updated.remindersEnabled,
      schedules: parsed.data.schedules,
    },
  });

  return mapSettingsRow(updated);
}

export function ensureDefaultSchedules(
  schedules: NotificationSchedules | null | undefined,
): NotificationSchedules {
  return schedules?.length ? schedules : defaultNotificationSchedules();
}
