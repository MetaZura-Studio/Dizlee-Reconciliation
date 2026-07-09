import { getLookupId } from "@/lib/admin/lookups";
import {
  listReportMonitoringLanes,
  type ReportMonitoringLane,
} from "@/lib/dizlee/reports-monitoring";
import { getActiveEmailTemplate } from "@/lib/platform/email-templates";
import { prisma } from "@/lib/prisma";

export type SendMissingReportRemindersResult = {
  opcoNotifications: number;
  partnerNotifications: number;
  message: string;
};

export type SendMissingReportRemindersInput = {
  month: number;
  year: number;
  target: "opco" | "partner" | "both";
  laneKeys?: string[];
  fromUserId: bigint;
  subject?: string;
  body?: string;
  throwIfNoRecipients?: boolean;
};

export class ReportReminderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReportReminderError";
    this.status = status;
  }
}

const DEFAULT_SUBJECT = "Report submission reminder";
const DEFAULT_BODY =
  "Please submit your monthly report for {{period}} as soon as possible.";

function periodLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
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

function lanesWithMissing(
  lanes: ReportMonitoringLane[],
  laneKeys: string[],
  target: SendMissingReportRemindersInput["target"],
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

async function resolveTemplates(
  subject?: string,
  body?: string,
): Promise<{ subjectTemplate: string; bodyTemplate: string }> {
  if (subject?.trim() && body?.trim()) {
    return { subjectTemplate: subject.trim(), bodyTemplate: body.trim() };
  }

  const template = await getActiveEmailTemplate("REPORT_REMINDER");
  return {
    subjectTemplate: subject?.trim() || template?.subject || DEFAULT_SUBJECT,
    bodyTemplate: body?.trim() || template?.body || DEFAULT_BODY,
  };
}

export async function sendMissingReportReminders(
  params: SendMissingReportRemindersInput,
): Promise<SendMissingReportRemindersResult> {
  const {
    month,
    year,
    target,
    fromUserId,
    throwIfNoRecipients = true,
  } = params;
  const laneKeys = params.laneKeys ?? [];
  const period = periodLabel(month, year);

  const fullEligible = lanesWithMissing(
    await getAllMonitoringLanes(month, year),
    laneKeys,
    target,
  );

  if (fullEligible.length === 0) {
    if (!throwIfNoRecipients) {
      return {
        opcoNotifications: 0,
        partnerNotifications: 0,
        message: "No lanes with missing reports found for this period.",
      };
    }

    throw new ReportReminderError(
      laneKeys.length > 0
        ? "No selected lanes have missing reports for the chosen target."
        : "No lanes with missing reports found for this period.",
    );
  }

  const { subjectTemplate, bodyTemplate } = await resolveTemplates(
    params.subject,
    params.body,
  );

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
        period,
        opco_name: entry.opcoName,
        partner_name: partnerList,
        lane: partnerList,
      });
      const body = applyTemplate(bodyTemplate, {
        period,
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
        period,
        opco_name: entry.lanes[0]?.split(" / ")[0] ?? "",
        partner_name: entry.partnerName,
        lane: laneList,
      });
      const body = applyTemplate(bodyTemplate, {
        period,
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
    if (!throwIfNoRecipients) {
      return {
        opcoNotifications: 0,
        partnerNotifications: 0,
        message:
          "No reminders were sent — no missing reports match the selected target.",
      };
    }

    throw new ReportReminderError(
      "No reminders were sent — no missing reports match the selected target.",
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
