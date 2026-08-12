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
import {
  parseReportWorkbook,
  ReportParseError,
} from "@/lib/opco/excel/parse-report";
import { getOpcoSession } from "@/lib/opco/auth";
import { validateReportUploadFile } from "@/lib/opco/validation/report-upload";
import { mapParsedLinesToPreview } from "@/lib/platform/report-preview";

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
    const { config } = await loadOpcoMappingParseConfig(BigInt(session.opcoId));

    const lineItems = config
      ? toParsedLines(
          (
            await parseOpcoReportWithMapping(buffer, config)
          )[
            config.partnerMode === "EXCEL_COLUMN"
              ? "partnerColumnLines"
              : config.partnerMode === "SERVICE_PARTNER_MAP"
                ? "serviceMapLines"
                : "pickerLines"
          ],
        )
      : await parseReportWorkbook(buffer);

    return NextResponse.json({
      filename: uploadFile.name,
      lineItemCount: lineItems.length,
      lineItems: mapParsedLinesToPreview(lineItems),
    });
  } catch (error) {
    if (error instanceof ReportParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return jsonError(error);
  }
}
