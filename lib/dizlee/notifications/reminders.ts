import { type DashboardPeriod } from "@/lib/dizlee/dashboard";
import { NotificationError } from "@/lib/dizlee/notifications/intimations";
import { getLookupId } from "@/lib/dizlee/lookups";
import {
  listReportMonitoringLanes,
  parseReportMonitoringFilters,
  type ReportMonitoringLane,
  type ReportMonitoringResult,
} from "@/lib/dizlee/reports-monitoring";
import { getActiveEmailTemplate } from "@/lib/platform/email-templates";
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

function periodFromParts(month: number, year: number): DashboardPeriod {
  return {
    month,
    year,
    label: new Date(year, month - 1, 1).toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    }),
  };
}

function applyTemplate(
  template: string,
  values: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

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

function lanesWithMissing(
  lanes: ReportMonitoringLane[],
  laneKeys: string[],
  target: SendReportRemindersInput["target"],
): ReportMonitoringLane[] {
  const selected = laneKeys.length
    ? lanes.filter((lane) => laneKeys.includes(lane.laneKey))
    : lanes;

  return selected.filter((lane) => {
    if (target === "opco") {
      return lane.opcoReport.status === "Missing";
    }
    if (target === "partner") {
      return lane.partnerReport.status === "Missing";
    }
    return (
      lane.opcoReport.status === "Missing" ||
      lane.partnerReport.status === "Missing"
    );
  });
}

export async function sendReportReminders(params: {
  input: SendReportRemindersInput;
  fromUserId: string;
}): Promise<SendReportRemindersResult> {
  const { month, year, laneKeys, target } = params.input;
  const period = periodFromParts(month, year);

  const fullEligible = lanesWithMissing(
    await getAllMonitoringLanes(month, year),
    laneKeys,
    target,
  );

  if (fullEligible.length === 0) {
    throw new NotificationError(
      laneKeys.length > 0
        ? "No selected lanes have missing reports for the chosen target."
        : "No lanes with missing reports found for this period.",
      400,
    );
  }

  const settings = await getReminderSettings();
  const subjectTemplate = params.input.subject?.trim() || settings.templateSubject;
  const bodyTemplate = params.input.body?.trim() || settings.templateBody;

  const fromUserId = BigInt(params.fromUserId);
  const [sentStatusId, opcoRecipientTypeId, partnerRecipientTypeId] =
    await Promise.all([
      getLookupId("NOTIFICATION_STATUS", "SENT"),
      getLookupId("RECIPIENT_TYPE", "OPCO"),
      getLookupId("RECIPIENT_TYPE", "PARTNER"),
    ]);

  const sentAt = new Date();
  let opcoNotifications = 0;
  let partnerNotifications = 0;

  const shouldSendOpco = target === "opco" || target === "both";
  const shouldSendPartner = target === "partner" || target === "both";

  if (shouldSendOpco) {
    const byOpco = new Map<
      string,
      { opcoName: string; partners: string[] }
    >();

    for (const lane of fullEligible) {
      if (lane.opcoReport.status !== "Missing") {
        continue;
      }

      const entry = byOpco.get(lane.opcoId) ?? {
        opcoName: lane.opcoName,
        partners: [],
      };
      entry.partners.push(lane.partnerName);
      byOpco.set(lane.opcoId, entry);
    }

    for (const [opcoId, entry] of byOpco) {
      const partnerList = [...new Set(entry.partners)].join(", ");
      const subject = applyTemplate(subjectTemplate, {
        period: period.label,
        opco_name: entry.opcoName,
        partner_name: partnerList,
        lane: partnerList,
      });
      const body = applyTemplate(bodyTemplate, {
        period: period.label,
        opco_name: entry.opcoName,
        partner_name: partnerList,
        lane: partnerList,
      });

      await prisma.notification.create({
        data: {
          subject: subject.slice(0, 255),
          body,
          statusId: sentStatusId,
          priority: "REMINDER",
          sentAt,
          createdByUserId: fromUserId,
          updatedByUserId: fromUserId,
          recipients: {
            create: {
              recipientTypeId: opcoRecipientTypeId,
              recipientId: BigInt(opcoId),
              fromUserId,
              createdByUserId: fromUserId,
              updatedByUserId: fromUserId,
            },
          },
        },
      });
      opcoNotifications += 1;
    }
  }

  if (shouldSendPartner) {
    const byPartner = new Map<
      string,
      { partnerName: string; lanes: string[] }
    >();

    for (const lane of fullEligible) {
      if (lane.partnerReport.status !== "Missing") {
        continue;
      }

      const entry = byPartner.get(lane.partnerId) ?? {
        partnerName: lane.partnerName,
        lanes: [],
      };
      entry.lanes.push(`${lane.opcoName} / ${lane.partnerName}`);
      byPartner.set(lane.partnerId, entry);
    }

    for (const [partnerId, entry] of byPartner) {
      const laneList = [...new Set(entry.lanes)].join("; ");
      const subject = applyTemplate(subjectTemplate, {
        period: period.label,
        opco_name: entry.lanes[0]?.split(" / ")[0] ?? "",
        partner_name: entry.partnerName,
        lane: laneList,
      });
      const body = applyTemplate(bodyTemplate, {
        period: period.label,
        opco_name: entry.lanes[0]?.split(" / ")[0] ?? "",
        partner_name: entry.partnerName,
        lane: laneList,
      });

      await prisma.notification.create({
        data: {
          subject: subject.slice(0, 255),
          body,
          statusId: sentStatusId,
          priority: "REMINDER",
          sentAt,
          createdByUserId: fromUserId,
          updatedByUserId: fromUserId,
          recipients: {
            create: {
              recipientTypeId: partnerRecipientTypeId,
              recipientId: BigInt(partnerId),
              fromUserId,
              createdByUserId: fromUserId,
              updatedByUserId: fromUserId,
            },
          },
        },
      });
      partnerNotifications += 1;
    }
  }

  if (opcoNotifications === 0 && partnerNotifications === 0) {
    throw new NotificationError(
      "No reminders were sent — no missing reports match the selected target.",
      400,
    );
  }

  const parts: string[] = [];
  if (opcoNotifications > 0) {
    parts.push(
      `${opcoNotifications} OpCo reminder${opcoNotifications === 1 ? "" : "s"}`,
    );
  }
  if (partnerNotifications > 0) {
    parts.push(
      `${partnerNotifications} Partner reminder${partnerNotifications === 1 ? "" : "s"}`,
    );
  }

  return {
    opcoNotifications,
    partnerNotifications,
    message: `Sent ${parts.join(" and ")}.`,
  };
}

async function getAllMonitoringLanes(
  month: number,
  year: number,
): Promise<ReportMonitoringLane[]> {
  const firstPage = await listReportMonitoringLanes({
    month,
    year,
    page: 1,
    missing: "any",
  });

  if (firstPage.totalPages <= 1) {
    return firstPage.items;
  }

  const lanes = [...firstPage.items];
  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const next = await listReportMonitoringLanes({
      month,
      year,
      page,
      missing: "any",
    });
    lanes.push(...next.items);
  }

  return lanes;
}
