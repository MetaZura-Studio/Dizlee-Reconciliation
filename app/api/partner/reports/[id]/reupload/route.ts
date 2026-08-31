/**
 * POST — Partner portal.
 * Submit a replacement report file after an approved re-upload.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { parseReportWorkbook } from "@/lib/partner/excel/parse-report";
import { getPartnerSession } from "@/lib/partner/auth";
import { reuploadCorrectedReport } from "@/lib/partner/queries/reupload-report";
import { validateReportUploadFile } from "@/lib/partner/validation/report-upload";
import { assertExcelBufferMagic } from "@/lib/platform/excel-upload";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getPartnerSession();

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
    const magicError = assertExcelBufferMagic(buffer, uploadFile.name);
    if (magicError) {
      return jsonError(appErrorFromUnknown(magicError, 400));
    }
    const lineItems = await parseReportWorkbook(buffer);
    const result = await reuploadCorrectedReport({
      partnerId: BigInt(session.partnerId),
      userId: BigInt(session.userId),
      reportId: BigInt(id),
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
    return jsonError(error);
  }
}
