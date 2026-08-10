/**
 * POST — OpCo portal.
 * Submit a replacement report file after an approved re-upload.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { parseReportWorkbook } from "@/lib/opco/excel/parse-report";
import { getOpcoSession } from "@/lib/opco/auth";
import { reuploadCorrectedReport } from "@/lib/opco/queries/reupload-report";
import { validateReportUploadFile } from "@/lib/opco/validation/report-upload";
import { storageDiagnostics } from "@/lib/platform/storage/object-storage";

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
    const lineItems = await parseReportWorkbook(buffer);
    const result = await reuploadCorrectedReport({
      opcoId: BigInt(session.opcoId),
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
    return jsonError(error, { storage: storageDiagnostics() });
  }
}
