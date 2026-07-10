import { formatPeriodLabel } from "@/lib/partner/period";
import { getPartnerLookupId } from "@/lib/partner/lookups";
import { PARTNER_REPORT_VERSION } from "@/lib/platform/reports/sides";
import prisma from "@/lib/prisma";

export class ReportChangeRequestError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReportChangeRequestError";
    this.status = status;
  }
}

const REQUESTABLE_REPORT_STATUSES = new Set(["SUBMITTED", "APPROVED", "RESUBMITTED"]);

type CreateReportChangeRequestInput = {
  partnerId: bigint;
  userId: bigint;
  reportId: bigint;
  reason: string;
};

async function notifyDizleeUsers(params: {
  fromUserId: bigint;
  subject: string;
  body: string;
}): Promise<void> {
  const [sentStatusId, userRecipientTypeId, dizleeUsers] = await Promise.all([
    getPartnerLookupId("NOTIFICATION_STATUS", "SENT"),
    getPartnerLookupId("RECIPIENT_TYPE", "USER"),
    prisma.user.findMany({
      where: {
        role: { code: "CLIENT", lookupType: { code: "USER_ROLE" } },
      },
      select: { id: true },
    }),
  ]);

  if (dizleeUsers.length === 0) {
    return;
  }

  await prisma.notification.create({
    data: {
      subject: params.subject,
      body: params.body,
      statusId: sentStatusId,
      sentAt: new Date(),
      createdByUserId: params.fromUserId,
      recipients: {
        create: dizleeUsers.map((user) => ({
          recipientTypeId: userRecipientTypeId,
          recipientId: user.id,
          fromUserId: params.fromUserId,
        })),
      },
    },
  });
}

export async function createReportChangeRequest(
  input: CreateReportChangeRequestInput,
): Promise<{ changeRequestId: string }> {
  const report = await prisma.report.findFirst({
    where: {
      id: input.reportId,
      partnerId: input.partnerId,
      version: PARTNER_REPORT_VERSION,
    },
    include: {
      partner: { select: { name: true } },
      opco: { select: { name: true } },
      status: { select: { code: true } },
    },
  });

  if (!report) {
    throw new ReportChangeRequestError("Report not found", 404);
  }

  if (!REQUESTABLE_REPORT_STATUSES.has(report.status.code)) {
    throw new ReportChangeRequestError(
      "Only submitted reports can have a reupload requested",
      400,
    );
  }

  const pendingRequest = await prisma.reportChangeRequest.findFirst({
    where: {
      reportId: input.reportId,
      decidedAt: null,
    },
    select: { id: true },
  });

  if (pendingRequest) {
    throw new ReportChangeRequestError(
      "A pending reupload request already exists for this report",
      409,
    );
  }

  const pendingStatusId = await getPartnerLookupId("REPORT_STATUS", "PENDING");

  const changeRequest = await prisma.reportChangeRequest.create({
    data: {
      reportId: input.reportId,
      requestedByUserId: input.userId,
      statusId: pendingStatusId,
      reason: input.reason,
    },
    select: { id: true },
  });

  const periodLabel = formatPeriodLabel(report.year, report.month);

  await notifyDizleeUsers({
    fromUserId: input.userId,
    subject: "Partner report reupload requested",
    body: `${report.partner.name} requested a reupload for ${report.opco.name} (${periodLabel}). Reason: ${input.reason}`,
  });

  return { changeRequestId: changeRequest.id.toString() };
}
