/**
 * OpCo asks Admin to configure Report map; fulfill when mapping becomes ready.
 */

import "server-only";

import { parseStoredSampleHeaders } from "@/lib/admin/opco-report-mapping-excel";
import { getOpcoReportMappingByOpcoId } from "@/lib/admin/opco-report-mappings";
import { isOpcoReportMappingConfigured } from "@/lib/admin/opco-report-mappings.shared";
import { DomainError } from "@/lib/errors/app-error";
import type { OpcoUploadReadiness } from "@/lib/opco/upload-readiness.shared";
import { notifyAdminUsers } from "@/lib/platform/notify-dizlee";
import {
  formatReportMapRequestBody,
  reportMapRequestSubject,
} from "@/lib/platform/report-map-request";
import { prisma } from "@/lib/prisma";

export type { OpcoUploadReadiness } from "@/lib/opco/upload-readiness.shared";

export class ReportMapRequestError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ReportMapRequestError", keyOrMessage, status);
  }
}

export async function getOpcoUploadReadiness(
  opcoId: bigint,
): Promise<OpcoUploadReadiness> {
  const [mappingRow, pending] = await Promise.all([
    getOpcoReportMappingByOpcoId(opcoId),
    prisma.opcoReportMapRequest.findFirst({
      where: { opcoId, status: "PENDING" },
      select: { id: true },
    }),
  ]);

  const preferredSheetName = mappingRow
    ? parseStoredSampleHeaders(mappingRow.headersJson).sheetName
    : null;

  const mappingConfigured = mappingRow
    ? isOpcoReportMappingConfigured({
        sampleSheetName: preferredSheetName,
        serviceColumn: mappingRow.serviceColumn,
        revenueColumn: mappingRow.revenueColumn,
        revenueShareColumn: mappingRow.revenueShareColumn,
        partnerMode: mappingRow.partnerMode,
        partnerColumn: mappingRow.partnerColumn,
      })
    : false;

  return {
    mappingConfigured,
    pendingRequest: Boolean(pending),
  };
}

export async function requestReportMapFromOpco(params: {
  opcoId: bigint;
  userId: bigint;
  message?: string | null;
}): Promise<{ alreadyPending: boolean }> {
  const opco = await prisma.opco.findFirst({
    where: { id: params.opcoId, isDeleted: false },
    select: { id: true, name: true },
  });
  if (!opco) {
    throw new ReportMapRequestError("OpCo not found", 404);
  }

  const readiness = await getOpcoUploadReadiness(opco.id);
  if (readiness.mappingConfigured) {
    throw new ReportMapRequestError(
      "Report mapping is already configured. You can upload reports now.",
      400,
    );
  }

  if (readiness.pendingRequest) {
    return { alreadyPending: true };
  }

  const message = params.message?.trim() || null;

  await prisma.opcoReportMapRequest.create({
    data: {
      opcoId: opco.id,
      requestedByUserId: params.userId,
      message,
      status: "PENDING",
    },
  });

  await notifyAdminUsers({
    fromUserId: params.userId,
    subject: reportMapRequestSubject(opco.name),
    body: formatReportMapRequestBody({
      opcoName: opco.name,
      message,
    }),
    metadata: {
      type: "REPORT_MAP_REQUEST",
      opcoId: opco.id.toString(),
      opcoName: opco.name,
    },
  });

  return { alreadyPending: false };
}

export { fulfillPendingReportMapRequests } from "@/lib/opco/queries/fulfill-report-map-request";
