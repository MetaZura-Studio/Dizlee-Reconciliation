import { getLookupId } from "@/lib/admin/lookups";
import type { BroadcastTemplateCode } from "@/lib/dizlee/notifications/broadcast.shared";
import {
  listInvoiceMonitoringLanes,
  type InvoiceMonitoringLane,
} from "@/lib/dizlee/invoices-monitoring";
import { getActiveEmailTemplate } from "@/lib/platform/email-templates";
import {
  applyTemplate,
  periodLabel,
} from "@/lib/platform/template-placeholders";
import { prisma } from "@/lib/prisma";

export type SendMissingInvoiceRemindersResult = {
  opcoNotifications: number;
  partnerNotifications: number;
  message: string;
};

export type SendMissingInvoiceRemindersInput = {
  month: number;
  year: number;
  target: "opco" | "partner" | "both";
  fromUserId: bigint;
  templateCode?: BroadcastTemplateCode;
  throwIfNoRecipients?: boolean;
};

export class InvoiceReminderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "InvoiceReminderError";
    this.status = status;
  }
}

async function getAllInvoiceLanes(
  month: number,
  year: number,
): Promise<InvoiceMonitoringLane[]> {
  const firstPage = await listInvoiceMonitoringLanes({
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
    const next = await listInvoiceMonitoringLanes({
      month,
      year,
      page,
      missing: "any",
    });
    lanes.push(...next.items);
  }

  return lanes;
}

async function resolveTemplates(
  templateCode: BroadcastTemplateCode,
): Promise<{ subjectTemplate: string; bodyTemplate: string }> {
  const template = await getActiveEmailTemplate(templateCode);
  if (!template) {
    throw new InvoiceReminderError("Selected template was not found.", 400);
  }

  return {
    subjectTemplate: template.subject,
    bodyTemplate: template.body,
  };
}

export async function sendMissingInvoiceReminders(
  params: SendMissingInvoiceRemindersInput,
): Promise<SendMissingInvoiceRemindersResult> {
  const {
    month,
    year,
    target,
    fromUserId,
    throwIfNoRecipients = true,
  } = params;
  const period = periodLabel(month, year);
  const lanes = await getAllInvoiceLanes(month, year);

  const { subjectTemplate, bodyTemplate } = await resolveTemplates(
    params.templateCode ?? "INVOICE_REMINDER",
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
    const opcoIds = new Set<string>();
    for (const lane of lanes) {
      if (lane.opcoInvoice.status === "Missing") {
        opcoIds.add(lane.opcoId);
      }
    }

    for (const opcoId of opcoIds) {
      const subject = applyTemplate(subjectTemplate, { period });
      const body = applyTemplate(bodyTemplate, { period });

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
    const partnerIds = new Set<string>();
    for (const lane of lanes) {
      if (lane.partnerInvoice.status === "Missing") {
        partnerIds.add(lane.partnerId);
      }
    }

    for (const partnerId of partnerIds) {
      const subject = applyTemplate(subjectTemplate, { period });
      const body = applyTemplate(bodyTemplate, { period });

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
        message: "No OpCo–Partner pairs with missing invoices found for this period.",
      };
    }
    throw new InvoiceReminderError(
      "No OpCo–Partner pairs with missing invoices found for this period.",
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
