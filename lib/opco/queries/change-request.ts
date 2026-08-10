/**
 * OpCo-initiated report reupload requests (change requests) pending Dizlee decision.
 *
 * Portal: OpCo. Only SUBMITTED / APPROVED / RESUBMITTED reports; one open request
 * per report. Does not mutate report files — approval unlocks `reuploadCorrectedReport`.
 */

import { formatPeriodLabel } from "@/lib/opco/period";
import { getOpcoLookupId } from "@/lib/opco/lookups";
import { OPCO_REPORT_VERSION } from "@/lib/platform/reports/sides";
import { writePlatformAuditLog } from "@/lib/platform/audit-log";
import { notifyDizleeUsers } from "@/lib/platform/notify-dizlee";
import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export class ReportChangeRequestError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ReportChangeRequestError", keyOrMessage, status);
  }
}

const REQUESTABLE_REPORT_STATUSES = new Set(["SUBMITTED", "APPROVED", "RESUBMITTED"]);

type CreateReportChangeRequestInput = {
  opcoId: bigint;
  userId: bigint;
  reportId: bigint;
  reason: string;
};

export async function createReportChangeRequest(
  input: CreateReportChangeRequestInput,
): Promise<{ changeRequestId: string }> {
  const report = await prisma.report.findFirst({
    where: {
      id: input.reportId,
      opcoId: input.opcoId,
      version: OPCO_REPORT_VERSION,
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

  const pendingStatusId = await getOpcoLookupId("REPORT_STATUS", "PENDING");

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
    subject: "OpCo report reupload requested",
    body: `${report.opco.name} requested a reupload for ${report.partner.name} (${periodLabel}). Reason: ${input.reason}`,
  });

  await writePlatformAuditLog({
    actorUserId: input.userId,
    action: "REPORT_CHANGE_REQUESTED",
    entityType: "REPORT",
    entityId: input.reportId,
    message: `OpCo requested report reupload for ${report.opco.name} / ${report.partner.name} (${periodLabel})`,
    metadata: {
      changeRequestId: changeRequest.id.toString(),
      reason: input.reason,
    },
  });

  return { changeRequestId: changeRequest.id.toString() };
}
