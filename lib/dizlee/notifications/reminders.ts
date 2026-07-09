import { NotificationError } from "@/lib/dizlee/notifications/intimations";
import {
  listReportMonitoringLanes,
  parseReportMonitoringFilters,
  type ReportMonitoringResult,
} from "@/lib/dizlee/reports-monitoring";
import { getActiveEmailTemplate } from "@/lib/platform/email-templates";
import {
  ReportReminderError,
  sendMissingReportReminders,
} from "@/lib/platform/report-reminders";
import { prisma } from "@/lib/prisma";

export type ReminderSettingsView = {
  remindersEnabled: boolean;
  reminderValue: number | null;
  reminderUnit: string | null;
  templateSubject: string;
  templateBody: string;
};

export type SendReportRemindersInput = {
  month: number;
  year: number;
  laneKeys: string[];
  target: "opco" | "partner" | "both";
  subject?: string;
  body?: string;
};

export type SendReportRemindersResult = {
  opcoNotifications: number;
  partnerNotifications: number;
  message: string;
};

const DEFAULT_SUBJECT = "Report submission reminder";
const DEFAULT_BODY =
  "Please submit your monthly report for {{period}} as soon as possible.";

export function parseReminderFilters(
  searchParams: URLSearchParams,
): Parameters<typeof listReportMonitoringLanes>[0] {
  return parseReportMonitoringFilters(searchParams);
}

export async function getReminderSettings(): Promise<ReminderSettingsView> {
  const [settings, template] = await Promise.all([
    prisma.appSettings.findFirst({
      where: { id: 1 },
      select: {
        remindersEnabled: true,
        reminderValue: true,
        reminderUnit: true,
      },
    }),
    getActiveEmailTemplate("REPORT_REMINDER"),
  ]);

  return {
    remindersEnabled: settings?.remindersEnabled ?? false,
    reminderValue: settings?.reminderValue ?? null,
    reminderUnit: settings?.reminderUnit ?? null,
    templateSubject: template?.subject ?? DEFAULT_SUBJECT,
    templateBody: template?.body ?? DEFAULT_BODY,
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
      subject: input.subject,
      body: input.body,
      throwIfNoRecipients: true,
    });
  } catch (error) {
    if (error instanceof ReportReminderError) {
      throw new NotificationError(error.message, error.status);
    }
    throw error;
  }
}
