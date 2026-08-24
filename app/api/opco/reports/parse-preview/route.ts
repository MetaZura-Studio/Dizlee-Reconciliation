/**
 * POST — OpCo portal.
 * Parse an uploaded report file and return validation preview before submit.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import {
  loadOpcoMappingParseConfig,
  toParsedLines,
} from "@/lib/opco/excel/load-opco-mapping-parse";
import { parseOpcoReportWithMapping } from "@/lib/opco/excel/parse-mapped-opco-report";
import { parseReportWorkbook } from "@/lib/opco/excel/parse-report";
import { getOpcoSession } from "@/lib/opco/auth";
import { findUnlinkedPartnersInOpcoFile } from "@/lib/opco/queries/unlinked-partners-in-file";
import { emptyUnlinkedPartnersInFile } from "@/lib/opco/unlinked-partners-in-file.shared";
import { validateReportUploadFile } from "@/lib/opco/validation/report-upload";
import { mapParsedLinesToPreview } from "@/lib/platform/report-preview";
import { getOpcoReportFx } from "@/lib/platform/report-fx";

export async function POST(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
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
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    const fx =
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12
        ? await getOpcoReportFx({
            opcoId: BigInt(session.opcoId),
            month,
            year,
          })
        : undefined;
    const { config } = await loadOpcoMappingParseConfig(BigInt(session.opcoId));

    if (!config) {
      const lineItems = await parseReportWorkbook(buffer);
      const unmatched = emptyUnlinkedPartnersInFile();
      return NextResponse.json({
        filename: uploadFile.name,
        lineItemCount: lineItems.length,
        lineItems: mapParsedLinesToPreview(lineItems, fx),
        currencyCode: fx?.currencyCode,
        unlinkedPartnerNames: unmatched.unlinkedPartnerNames,
        unknownPartnerNames: unmatched.unknownPartnerNames,
      });
    }

    const parsedMapped = await parseOpcoReportWithMapping(buffer, config);
    const mappedLines =
      config.partnerMode === "EXCEL_COLUMN"
        ? parsedMapped.partnerColumnLines
        : config.partnerMode === "SERVICE_PARTNER_MAP"
          ? parsedMapped.serviceMapLines
          : parsedMapped.pickerLines;
    const lineItems = toParsedLines(mappedLines);
    const unmatched = await findUnlinkedPartnersInOpcoFile({
      opcoId: BigInt(session.opcoId),
      partnerMode: config.partnerMode,
      partnerColumnLines: parsedMapped.partnerColumnLines,
      serviceMapLines: parsedMapped.serviceMapLines,
    });

    return NextResponse.json({
      filename: uploadFile.name,
      lineItemCount: lineItems.length,
      lineItems: mapParsedLinesToPreview(lineItems, fx),
      currencyCode: fx?.currencyCode,
      unlinkedPartnerNames: unmatched.unlinkedPartnerNames,
      unknownPartnerNames: unmatched.unknownPartnerNames,
    });
  } catch (error) {
    return jsonError(error);
  }
}
