/**
 * POST — Partner portal.
 * Parse an uploaded report file and return validation preview before submit.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { parseReportWorkbook } from "@/lib/partner/excel/parse-report";
import { getPartnerSession } from "@/lib/partner/auth";
import { validateReportUploadFile } from "@/lib/partner/validation/report-upload";
import { mapParsedLinesToPreview } from "@/lib/platform/report-preview";

export async function POST(request: Request) {
  const session = await getPartnerSession();

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
    const lineItems = await parseReportWorkbook(buffer);

    return NextResponse.json({
      filename: uploadFile.name,
      lineItemCount: lineItems.length,
      lineItems: mapParsedLinesToPreview(lineItems),
    });
  } catch (error) {
    return jsonError(error);
  }
}
