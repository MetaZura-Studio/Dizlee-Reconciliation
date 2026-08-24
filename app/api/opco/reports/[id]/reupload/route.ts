/**
 * POST — OpCo portal.
 * Submit a replacement report file after an approved re-upload.
 * Uses Admin OpCo column mapping (same as first upload).
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import {
  loadOpcoMappingParseConfig,
  toParsedLines,
} from "@/lib/opco/excel/load-opco-mapping-parse";
import { parseOpcoReportWithMapping } from "@/lib/opco/excel/parse-mapped-opco-report";
import {
  parseReportWorkbook,
  ReportParseError,
} from "@/lib/opco/excel/parse-report";
import { getOpcoSession } from "@/lib/opco/auth";
import { reuploadCorrectedReport } from "@/lib/opco/queries/reupload-report";
import {
  PartnerColumnResolveError,
  resolvePartnerColumnLinesToBuckets,
} from "@/lib/opco/queries/resolve-partner-column-lines";
import {
  ServicePartnerResolveError,
  resolveLookupLinesToPartnerBuckets,
} from "@/lib/opco/queries/resolve-service-partner-maps";
import { validateReportUploadFile } from "@/lib/opco/validation/report-upload";
import prisma from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid report id", 400));
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const fileError =
      file instanceof File
        ? validateReportUploadFile(file)
        : "Excel file is required";

    if (fileError) {
      return jsonError(appErrorFromUnknown(fileError, 400));
    }

    const uploadFile = file as File;
    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const opcoId = BigInt(session.opcoId);
    const reportId = BigInt(id);

    const existing = await prisma.report.findFirst({
      where: { id: reportId, opcoId },
      select: { partnerId: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const { config } = await loadOpcoMappingParseConfig(opcoId);
    let lineItems = config
      ? await lineItemsForPartner(buffer, opcoId, existing.partnerId, config)
      : await parseReportWorkbook(buffer);

    const result = await reuploadCorrectedReport({
      opcoId,
      userId: BigInt(session.userId),
      reportId,
      filename: uploadFile.name,
      mimeType:
        uploadFile.type ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
      lineItems,
    });

    return NextResponse.json({
      reportId: result.reportId,
      lineItemCount: result.lineItemCount,
      message: "Corrected report uploaded successfully",
    });
  } catch (error) {
    if (
      error instanceof ServicePartnerResolveError ||
      error instanceof PartnerColumnResolveError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return jsonError(error);
  }
}

async function lineItemsForPartner(
  buffer: Buffer,
  opcoId: bigint,
  partnerId: bigint,
  config: NonNullable<
    Awaited<ReturnType<typeof loadOpcoMappingParseConfig>>["config"]
  >,
) {
  const parsed = await parseOpcoReportWithMapping(buffer, config);

  if (config.partnerMode === "UPLOAD_PICKER") {
    return toParsedLines(parsed.pickerLines);
  }

  const buckets =
    config.partnerMode === "EXCEL_COLUMN"
      ? await resolvePartnerColumnLinesToBuckets({
          opcoId,
          lines: parsed.partnerColumnLines,
        })
      : await resolveLookupLinesToPartnerBuckets({
          opcoId,
          lines: parsed.serviceMapLines,
        });

  const bucket = buckets.find((item) => item.partnerId === partnerId);
  if (!bucket) {
    throw new ReportParseError(
      "The replacement file has no rows for this Partner. Check the Partner column or Service–Partner maps.",
    );
  }
  return bucket.lineItems;
}
