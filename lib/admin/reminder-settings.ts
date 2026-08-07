/**
 * Admin reminder settings — UC-07 duration, schedule JSON, and intimation/reminder templates.
 * Persists to `app_settings`; schedule shape validated via notification-schedules.shared.
 */
import { writeSettingsAuditLog } from "@/lib/admin/audit";
import {
  defaultNotificationSchedule,
  parseNotificationScheduleJson,
  type NotificationSchedule,
  type ScheduleTemplateOption,
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
  schedule: NotificationSchedule;
  templateOptions: {
    intimations: ScheduleTemplateOption[];
    reminders: ScheduleTemplateOption[];
  };
};

export class ReminderSettingsError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReminderSettingsError";
    this.status = status;
  }
}

async function loadScheduleTemplateOptions(): Promise<
  ReminderSettingsView["templateOptions"]
> {
  const templates = await prisma.notificationTemplate.findMany({
    where: {
      isDeleted: false,
      category: { in: ["INTIMATION", "REMINDER"] },
    },
    orderBy: [{ category: "asc" }, { name: "asc" }],
    select: { code: true, name: true, category: true },
  });

  const intimations: ScheduleTemplateOption[] = [];
  const reminders: ScheduleTemplateOption[] = [];

  for (const template of templates) {
    if (template.category === "INTIMATION") {
      intimations.push({
        code: template.code,
        name: template.name,
        category: "INTIMATION",
      });
    } else if (template.category === "REMINDER") {
      reminders.push({
        code: template.code,
        name: template.name,
        category: "REMINDER",
      });
    }
  }

  return { intimations, reminders };
}

function mapSettingsRow(
  row: {
    remindersEnabled: boolean;
    reminderValue: number | null;
    reminderUnit: string | null;
    notificationSchedulesJson: string | null;
  },
  templateOptions: ReminderSettingsView["templateOptions"],
): ReminderSettingsView {
  return {
    remindersEnabled: row.remindersEnabled,
    reminderValue: row.reminderValue,
    reminderUnit:
      row.reminderUnit && isReminderUnit(row.reminderUnit)
        ? row.reminderUnit
        : "days",
    schedule: parseNotificationScheduleJson(row.notificationSchedulesJson),
    templateOptions,
  };
}

export async function getReminderSettings(): Promise<ReminderSettingsView> {
  const [settings, templateOptions] = await Promise.all([
    prisma.appSettings.findFirst({
      where: { id: 1 },
      select: {
        remindersEnabled: true,
        reminderValue: true,
        reminderUnit: true,
        notificationSchedulesJson: true,
      },
    }),
    loadScheduleTemplateOptions(),
  ]);

  if (!settings) {
    throw new ReminderSettingsError(
      "Application settings could not be loaded.",
      500,
    );
  }

  return mapSettingsRow(settings, templateOptions);
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

  const templateOptions = await loadScheduleTemplateOptions();
  const intimationCodes = new Set(
    templateOptions.intimations.map((row) => row.code),
  );
  const reminderCodes = new Set(
    templateOptions.reminders.map((row) => row.code),
  );

  for (const step of parsed.data.schedule.intimations) {
    if (!intimationCodes.has(step.templateCode)) {
      throw new ReminderSettingsError(
        `Unknown intimation template: ${step.templateCode}`,
      );
    }
  }
  for (const step of parsed.data.schedule.reminders) {
    if (!reminderCodes.has(step.templateCode)) {
      throw new ReminderSettingsError(
        `Unknown reminder template: ${step.templateCode}`,
      );
    }
  }

  const schedulesJson = JSON.stringify(parsed.data.schedule);

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
      schedule: parsed.data.schedule,
    },
  });

  return mapSettingsRow(updated, templateOptions);
}

export function ensureDefaultSchedule(
  schedule: NotificationSchedule | null | undefined,
): NotificationSchedule {
  return schedule ?? defaultNotificationSchedule();
}
