/**
 * POST — OpCo portal.
 * Upload report using Admin OpCo report column mapping
 * (UPLOAD_PICKER may fall back to the generic Excel parser when unmapped).
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import {
  assertOpcoMappingReady,
  parseOpcoReportWithMapping,
} from "@/lib/opco/excel/parse-mapped-opco-report";
import {
  parseReportWorkbook,
  ReportParseError,
  type ParsedReportLine,
} from "@/lib/opco/excel/parse-report";
import { getOpcoSession } from "@/lib/opco/auth";
import {
  createReportUpload,
  ReportUploadError,
} from "@/lib/opco/queries/upload-report";
import {
  resolvePartnerColumnLinesToBuckets,
  PartnerColumnResolveError,
} from "@/lib/opco/queries/resolve-partner-column-lines";
import {
  resolveLookupLinesToPartnerBuckets,
  ServicePartnerResolveError,
} from "@/lib/opco/queries/resolve-service-partner-maps";
import {
  reportUploadLookupMetadataSchema,
  reportUploadMetadataSchema,
  validateReportUploadFile,
} from "@/lib/opco/validation/report-upload";
import { getOpcoReportMappingByOpcoId } from "@/lib/admin/opco-report-mappings";
import { parseStoredSampleHeaders } from "@/lib/admin/opco-report-mapping-excel";
import type { ResolvedServicePartnerLine } from "@/lib/platform/service-partner-map";
import { storageDiagnostics } from "@/lib/platform/storage/object-storage";

function toParsedLines(lines: ResolvedServicePartnerLine[]): ParsedReportLine[] {
  return lines.map((line, index) => ({
    lineNumber: index + 1,
    description: line.description,
    usageAmount: null,
    usageUsd: null,
    amount: line.amount,
    revenueSharePercent: line.revenueSharePercent,
    exchangeRate: null,
    usageUnit: null,
    reconciliationBasis: null,
    sourceColumns: line.sourceColumns,
  }));
}

export async function POST(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const opcoId = BigInt(session.opcoId);
    const mappingRow = await getOpcoReportMappingByOpcoId(opcoId);
    if (!mappingRow) {
      return NextResponse.json(
        {
          error:
            "OpCo report column mapping is not configured. Ask an admin to set it under OpCos → Report map.",
        },
        { status: 400 },
      );
    }

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
    const yearRaw = formData.get("year");
    const monthRaw = formData.get("month");
    const mimeType =
      uploadFile.type ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const preferredSheetName = parseStoredSampleHeaders(
      mappingRow.headersJson,
    ).sheetName;

    if (mappingRow.partnerMode === "UPLOAD_PICKER") {
      const metadataResult = reportUploadMetadataSchema.safeParse({
        partnerId: formData.get("partnerId"),
        year: yearRaw,
        month: monthRaw,
      });
      if (!metadataResult.success) {
        return NextResponse.json(
          {
            error: "Invalid upload details",
            details: metadataResult.error.flatten().fieldErrors,
          },
          { status: 400 },
        );
      }

      const lineItems =
        mappingRow.serviceColumn?.trim() && mappingRow.revenueColumn?.trim()
          ? toParsedLines(
              (
                await parseOpcoReportWithMapping(
                  buffer,
                  assertOpcoMappingReady({
                    serviceColumn: mappingRow.serviceColumn,
                    partnerMode: mappingRow.partnerMode,
                    partnerColumn: mappingRow.partnerColumn,
                    revenueColumn: mappingRow.revenueColumn,
                    revenueShareColumn: mappingRow.revenueShareColumn,
                    rowFilterColumn: mappingRow.rowFilterColumn,
                    rowFilterValue: mappingRow.rowFilterValue,
                    aggregateDailyRows: mappingRow.aggregateDailyRows,
                    preferredSheetName,
                  }),
                )
              ).pickerLines,
            )
          : await parseReportWorkbook(buffer);

      const result = await createReportUpload({
        opcoId,
        userId: BigInt(session.userId),
        partnerId: BigInt(metadataResult.data.partnerId),
        year: metadataResult.data.year,
        month: metadataResult.data.month,
        filename: uploadFile.name,
        mimeType,
        buffer,
        lineItems,
      });

      return NextResponse.json({
        reportId: result.reportId,
        lineItemCount: lineItems.length,
        message: "Report uploaded successfully",
      });
    }

    const mapping = assertOpcoMappingReady({
      serviceColumn: mappingRow.serviceColumn,
      partnerMode: mappingRow.partnerMode,
      partnerColumn: mappingRow.partnerColumn,
      revenueColumn: mappingRow.revenueColumn,
      revenueShareColumn: mappingRow.revenueShareColumn,
      rowFilterColumn: mappingRow.rowFilterColumn,
      rowFilterValue: mappingRow.rowFilterValue,
      aggregateDailyRows: mappingRow.aggregateDailyRows,
      preferredSheetName,
    });

    const metadataResult = reportUploadLookupMetadataSchema.safeParse({
      year: yearRaw,
      month: monthRaw,
    });
    if (!metadataResult.success) {
      return NextResponse.json(
        {
          error: "Invalid upload details",
          details: metadataResult.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const parsed = await parseOpcoReportWithMapping(buffer, mapping);
    const buckets =
      mapping.partnerMode === "EXCEL_COLUMN"
        ? await resolvePartnerColumnLinesToBuckets({
            opcoId,
            lines: parsed.partnerColumnLines,
          })
        : await resolveLookupLinesToPartnerBuckets({
            opcoId,
            lines: parsed.serviceMapLines,
          });

    const reportIds: string[] = [];
    let lineItemCount = 0;

    for (const bucket of buckets) {
      const result = await createReportUpload({
        opcoId,
        userId: BigInt(session.userId),
        partnerId: bucket.partnerId,
        year: metadataResult.data.year,
        month: metadataResult.data.month,
        filename: uploadFile.name,
        mimeType,
        buffer,
        lineItems: bucket.lineItems,
      });
      reportIds.push(result.reportId);
      lineItemCount += bucket.lineItems.length;
    }

    return NextResponse.json({
      reportId: reportIds[0] ?? "",
      reportIds,
      lineItemCount,
      partnerCount: buckets.length,
      message: "Report uploaded successfully",
    });
  } catch (error) {
    if (
      error instanceof ServicePartnerResolveError ||
      error instanceof PartnerColumnResolveError ||
      error instanceof ReportParseError
    ) {
      const status =
        error instanceof ServicePartnerResolveError ||
        error instanceof PartnerColumnResolveError
          ? error.status
          : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    if (error instanceof ReportUploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    return jsonError(error, { storage: storageDiagnostics() });
  }
}
