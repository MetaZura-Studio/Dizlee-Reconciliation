/**
 * Partner initial report upload: file persistence, line items, audit, and Dizlee notify.
 *
 * Portal: Partner. One report per OpCo/period on the Partner lane; rejects unlinked
 * OpCos and duplicate lane rows via `laneReportWhere`.
 */

import { Prisma } from "@prisma/client";

import type { ParsedReportLine } from "@/lib/partner/excel/parse-report";
import { isOpcoLinkedToPartner } from "@/lib/partner/queries/opcos";
import { saveReportFileLocally } from "@/lib/partner/storage/save-report-file";
import {
  PARTNER_REPORT_VERSION,
  laneReportWhere,
} from "@/lib/platform/reports/sides";
import { writePlatformAuditLog } from "@/lib/platform/audit-log";
import { notifyDizleeUsers } from "@/lib/platform/notify-dizlee";
import { snapshotFxOntoParsedLines } from "@/lib/platform/report-fx";
import { BASE_CURRENCY_RATE } from "@/lib/platform/currency-rates";
import { formatPeriodLabel } from "@/lib/partner/period";
import prisma from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export class ReportUploadError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("ReportUploadError", keyOrMessage, status);
  }
}

type CreateReportUploadInput = {
  partnerId: bigint;
  userId: bigint;
  opcoId: bigint;
  year: number;
  month: number;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  lineItems: ParsedReportLine[];
};

export async function createReportUpload(
  input: CreateReportUploadInput,
): Promise<{ reportId: string }> {
  const linked = await isOpcoLinkedToPartner(input.partnerId, input.opcoId);

  if (!linked) {
    throw new ReportUploadError("OpCo is not linked to this partner", 403);
  }

  const [opco, submittedStatus] = await Promise.all([
    prisma.opco.findFirst({
      where: { id: input.opcoId },
      select: { defaultCurrencyId: true },
    }),
    prisma.lookup.findFirst({
      where: {
        code: "SUBMITTED",
        lookupType: { code: "REPORT_STATUS" },
      },
      select: { id: true },
    }),
  ]);

  if (!opco) {
    throw new ReportUploadError("OpCo not found", 404);
  }

  if (!submittedStatus) {
    throw new ReportUploadError("Report status configuration is missing", 500);
  }

  // Partner amounts are USD; snapshot rate 1 for historical display.
  const lineItems = snapshotFxOntoParsedLines(
    input.lineItems,
    BASE_CURRENCY_RATE,
  );

  const existingReport = await prisma.report.findFirst({
    where: laneReportWhere("partner", {
      opcoId: input.opcoId,
      partnerId: input.partnerId,
      year: input.year,
      month: input.month,
    }),
    select: { id: true },
  });

  if (existingReport) {
    throw new ReportUploadError(
      "A report already exists for this OpCo and period",
      409,
    );
  }

  const savedFile = await saveReportFileLocally({
    buffer: input.buffer,
    filename: input.filename,
    mimeType: input.mimeType,
  });

  try {
    const file = await prisma.file.create({
      data: {
        filename: input.filename,
        storageKey: savedFile.storageKey,
        mimeType: input.mimeType,
        sizeBytes: savedFile.sizeBytes,
        checksum: savedFile.checksum,
        uploadedByUserId: input.userId,
      },
    });

    const report = await prisma.report.create({
      data: {
        month: input.month,
        year: input.year,
        opcoId: input.opcoId,
        partnerId: input.partnerId,
        fileId: file.id,
        currencyId: opco.defaultCurrencyId,
        statusId: submittedStatus.id,
        version: PARTNER_REPORT_VERSION,
        createdByUserId: input.userId,
        uploadedByUserId: input.userId,
        updatedByUserId: input.userId,
        lineItems: {
          create: lineItems.map((item) => ({
            lineNumber: item.lineNumber,
            description: item.description,
            usageAmount: item.usageAmount,
            usageUsd: item.usageUsd,
            amount: item.amount,
            revenueSharePercent: item.revenueSharePercent,
            exchangeRate: item.exchangeRate,
            usageUnit: item.usageUnit,
            reconciliationBasis: item.reconciliationBasis,
            sourceColumns: item.sourceColumns as Prisma.InputJsonValue,
          })),
        },
      },
      select: {
        id: true,
        opco: { select: { name: true } },
        partner: { select: { name: true } },
      },
    });

    await writePlatformAuditLog({
      actorUserId: input.userId,
      action: "REPORT_UPLOADED",
      entityType: "REPORT",
      entityId: report.id,
      message: `Partner uploaded report for ${report.opco.name} / ${report.partner.name} (${input.year}-${String(input.month).padStart(2, "0")})`,
      metadata: {
        opcoId: input.opcoId.toString(),
        partnerId: input.partnerId.toString(),
        month: input.month,
        year: input.year,
        filename: input.filename,
        exchangeRate: BASE_CURRENCY_RATE,
      },
    });

    const periodLabel = formatPeriodLabel(input.year, input.month);
    await notifyDizleeUsers({
      fromUserId: input.userId,
      subject: "Partner report uploaded",
      body: `${report.partner.name} uploaded a report for ${report.opco.name} (${periodLabel}).`,
    });

    return { reportId: report.id.toString() };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ReportUploadError(
        "A report already exists for this OpCo and period",
        409,
      );
    }

    throw error;
  }
}
