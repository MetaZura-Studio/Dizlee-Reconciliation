/**
 * Dizlee manual missing-report reminders — lane selection, attachments, template override.
 * Creates in-app notifications for OpCo/Partner users on unsubmitted report lanes.
 */
import { getLookupId } from "@/lib/admin/lookups";
import {
  listReportMonitoringLanes,
  type ReportMonitoringLane,
} from "@/lib/dizlee/reports-monitoring";
import { getActiveEmailTemplate } from "@/lib/platform/email-templates";
import {
  notificationAttachmentCreateInput,
  resolveNotificationAttachmentCreates,
} from "@/lib/platform/notification-attachments";
import {
  DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
  formatDeliveryMessage,
  NotificationDeliveryError,
  parseDeliveryChannel,
  type NotificationDeliveryChannel,
  type SendNotificationEmailsResult,
} from "@/lib/platform/notification-delivery.shared";
import {
  prepareEmailDelivery,
  sendNotificationEmails,
} from "@/lib/platform/notification-delivery";
import {
  applyTemplate,
  periodLabel,
} from "@/lib/platform/template-placeholders";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

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
  templateCode?: string;
  subject?: string;
  body?: string;
  throwIfNoRecipients?: boolean;
  attachmentFileIds?: string[];
  deliveryChannel?: import("@/lib/platform/notification-delivery").NotificationDeliveryChannel;
};

export class ReportReminderError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ReportReminderError", keyOrMessage, status);
  }
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
    sortBy: "opco",
    sortDir: "asc",
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
      sortBy: "opco",
      sortDir: "asc",
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
  templateCode: string,
  subject?: string,
  body?: string,
): Promise<{ subjectTemplate: string; bodyTemplate: string }> {
  const template = await getActiveEmailTemplate(templateCode);
  if (!template) {
    throw new ReportReminderError("Selected template was not found.", 400);
  }

  return {
    subjectTemplate: subject?.trim() || template.subject,
    bodyTemplate: body?.trim() || template.body,
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

  let deliveryChannel: NotificationDeliveryChannel =
    DEFAULT_NOTIFICATION_DELIVERY_CHANNEL;
  try {
    deliveryChannel = parseDeliveryChannel(
      params.deliveryChannel,
      DEFAULT_NOTIFICATION_DELIVERY_CHANNEL,
    );
  } catch (error) {
    if (error instanceof NotificationDeliveryError) {
      throw new ReportReminderError(error.message, error.status);
    }
    throw error;
  }

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
        message: "No OpCo–Partner pairs with missing reports found for this period.",
      };
    }

    throw new ReportReminderError(
      laneKeys.length > 0
        ? "No selected pairs have missing reports for the chosen target."
        : "No OpCo–Partner pairs with missing reports found for this period.",
    );
  }

  const { subjectTemplate, bodyTemplate } = await resolveTemplates(
    params.templateCode ?? "REPORT_REMINDER",
    params.subject,
    params.body,
  );

  const [sentStatusId, opcoRecipientTypeId, partnerRecipientTypeId] =
    await Promise.all([
      getLookupId("NOTIFICATION_STATUS", "SENT"),
      getLookupId("RECIPIENT_TYPE", "OPCO"),
      getLookupId("RECIPIENT_TYPE", "PARTNER"),
    ]);

  const attachmentCreates = await resolveNotificationAttachmentCreates({
    attachmentFileIds: params.attachmentFileIds ?? [],
    userId: fromUserId,
  });
  const attachments = notificationAttachmentCreateInput(
    attachmentCreates,
    fromUserId,
  );

  const sentAt = new Date();
  let opcoNotifications = 0;
  let partnerNotifications = 0;

  const shouldSendOpco = target === "opco" || target === "both";
  const shouldSendPartner = target === "partner" || target === "both";

  const opcoIds = new Set<string>();
  const partnerIds = new Set<string>();

  if (shouldSendOpco) {
    for (const lane of fullEligible) {
      if (lane.opcoReport.status !== "Missing") {
        continue;
      }
      opcoIds.add(lane.opcoId);
    }
  }

  if (shouldSendPartner) {
    for (const lane of fullEligible) {
      if (lane.partnerReport.status !== "Missing") {
        continue;
      }
      partnerIds.add(lane.partnerId);
    }
  }

  let emailRecipients: Awaited<ReturnType<typeof prepareEmailDelivery>> = [];
  try {
    emailRecipients = await prepareEmailDelivery({
      channel: deliveryChannel,
      opcoIds: [...opcoIds].map((id) => BigInt(id)),
      partnerIds: [...partnerIds].map((id) => BigInt(id)),
    });
  } catch (error) {
    if (error instanceof NotificationDeliveryError) {
      throw new ReportReminderError(error.message, error.status);
    }
    throw error;
  }

  for (const opcoId of opcoIds) {
    const subject = applyTemplate(subjectTemplate, { period });
    const body = applyTemplate(bodyTemplate, { period });

    await prisma.notification.create({
      data: {
        subject: subject.slice(0, 255),
        body,
        deliveryChannel,
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
        ...(attachments ? { attachments } : {}),
      },
    });
    opcoNotifications += 1;
  }

  for (const partnerId of partnerIds) {
    const subject = applyTemplate(subjectTemplate, { period });
    const body = applyTemplate(bodyTemplate, { period });

    await prisma.notification.create({
      data: {
        subject: subject.slice(0, 255),
        body,
        deliveryChannel,
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
        ...(attachments ? { attachments } : {}),
      },
    });
    partnerNotifications += 1;
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

  let emailResult: SendNotificationEmailsResult | null = null;
  if (emailRecipients.length > 0) {
    const subject = applyTemplate(subjectTemplate, { period }).slice(0, 255);
    const body = applyTemplate(bodyTemplate, { period });
    emailResult = await sendNotificationEmails({
      recipients: emailRecipients,
      subject,
      body,
    });
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

  const baseMessage = `Sent ${parts.join(" and ")}.`;

  return {
    opcoNotifications,
    partnerNotifications,
    message: formatDeliveryMessage({
      channel: deliveryChannel,
      baseMessage,
      emailResult,
    }),
  };
}
