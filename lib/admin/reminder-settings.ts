import { writeSettingsAuditLog } from "@/lib/admin/audit";
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
}): ReminderSettingsView {
  return {
    remindersEnabled: row.remindersEnabled,
    reminderValue: row.reminderValue,
    reminderUnit: row.reminderUnit,
  };
}

export async function getReminderSettings(): Promise<ReminderSettingsView> {
  const settings = await prisma.appSettings.findFirst({
    where: { id: 1 },
    select: {
      remindersEnabled: true,
      reminderValue: true,
      reminderUnit: true,
    },
  });

  if (!settings) {
    throw new ReminderSettingsError(
      "Application settings could not be loaded.",
      500,
    );
  }

  return mapSettingsRow({
    ...settings,
    reminderUnit:
      settings.reminderUnit && isReminderUnit(settings.reminderUnit)
        ? settings.reminderUnit
        : "days",
  });
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

  const updated = await prisma.appSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      remindersEnabled: parsed.data.remindersEnabled,
      reminderValue: parsed.data.reminderValue ?? null,
      reminderUnit: parsed.data.reminderUnit,
    },
    update: {
      remindersEnabled: parsed.data.remindersEnabled,
      reminderValue: parsed.data.reminderValue ?? null,
      reminderUnit: parsed.data.reminderUnit,
    },
    select: {
      remindersEnabled: true,
      reminderValue: true,
      reminderUnit: true,
    },
  });

  await writeSettingsAuditLog({
    actorUserId,
    action: "SETTINGS_REMINDERS_UPDATED",
    message: "Reminder settings updated.",
    metadata: {
      remindersEnabled: updated.remindersEnabled,
      reminderValue: updated.reminderValue,
      reminderUnit: updated.reminderUnit,
    },
  });

  return mapSettingsRow(updated);
}
