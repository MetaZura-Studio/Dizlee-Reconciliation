/**
 * POST — OpCo portal.
 * Parse an uploaded report file and return validation preview before submit.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { parseReportWorkbook } from "@/lib/opco/excel/parse-report";
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
