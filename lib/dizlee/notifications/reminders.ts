/**
 * Report reminder settings surface and bulk send orchestration for Dizlee operators.
 * Consumed by reminders UI; delegates missing-lane detection to report monitoring.
 */

import {
  type ReminderSettingsView,
  type SendReportRemindersInput,
  type SendReportRemindersResult,
} from "@/lib/dizlee/notifications/broadcast.shared";
import { getBroadcastTemplateOptions } from "@/lib/dizlee/notifications/intimations";
import { NotificationError } from "@/lib/dizlee/notifications/shared";
import {
  listReportMonitoringLanes,
  parseReportMonitoringFilters,
  type ReportMonitoringResult,
} from "@/lib/dizlee/reports-monitoring";
import {
  ReportReminderError,
  sendMissingReportReminders,
} from "@/lib/platform/report-reminders";
import { NotificationAttachmentError } from "@/lib/platform/notification-attachments";
import { prisma } from "@/lib/prisma";

export {
  DEFAULT_REMINDER_MESSAGE_SOURCE,
  type ReminderSettingsView,
  type SendReportRemindersInput,
  type SendReportRemindersResult,
} from "@/lib/dizlee/notifications/broadcast.shared";

export function parseReminderFilters(
  searchParams: URLSearchParams,
): Parameters<typeof listReportMonitoringLanes>[0] {
  return parseReportMonitoringFilters(searchParams);
}

export async function getReminderSettings(): Promise<ReminderSettingsView> {
  const [settings, templates] = await Promise.all([
    prisma.appSettings.findFirst({
      where: { id: 1 },
      select: {
        remindersEnabled: true,
        reminderValue: true,
        reminderUnit: true,
      },
    }),
    getBroadcastTemplateOptions(),
  ]);

  return {
    remindersEnabled: settings?.remindersEnabled ?? false,
    reminderValue: settings?.reminderValue ?? null,
    reminderUnit: settings?.reminderUnit ?? null,
    templates,
  };
}

export async function listReminderLanes(
  filters: Parameters<typeof listReportMonitoringLanes>[0],
): Promise<ReportMonitoringResult> {
  const monitoringFilters = {
    ...filters,
    missing: filters.missing ?? "any",
  };

  return listReportMonitoringLanes(monitoringFilters);
}

export async function sendReportReminders(params: {
  input: SendReportRemindersInput;
  fromUserId: string;
}): Promise<SendReportRemindersResult> {
  const { input, fromUserId } = params;

  try {
    return await sendMissingReportReminders({
      month: input.month,
      year: input.year,
      laneKeys: input.laneKeys,
      target: input.target,
      fromUserId: BigInt(fromUserId),
      templateCode: input.messageSource,
      subject: input.subject,
      body: input.body,
      attachmentFileIds: input.attachmentFileIds,
      deliveryChannel: input.deliveryChannel,
      throwIfNoRecipients: true,
    });
  } catch (error) {
    if (error instanceof ReportReminderError) {
      throw new NotificationError(error.message, error.status);
    }
    if (error instanceof NotificationAttachmentError) {
      throw new NotificationError(error.message, error.status);
    }
    throw error;
  }
}
