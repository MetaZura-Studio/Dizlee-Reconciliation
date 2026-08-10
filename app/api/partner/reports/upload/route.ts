/**
 * POST — Partner portal.
 * Upload and register a new partner report file.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { parseReportWorkbook } from "@/lib/partner/excel/parse-report";
import { getPartnerSession } from "@/lib/partner/auth";
import { createReportUpload } from "@/lib/partner/queries/upload-report";
import {
  reportUploadMetadataSchema,
  validateReportUploadFile,
} from "@/lib/partner/validation/report-upload";
import { storageDiagnostics } from "@/lib/platform/storage/object-storage";

export async function POST(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const metadataResult = reportUploadMetadataSchema.safeParse({
      opcoId: formData.get("opcoId"),
      year: formData.get("year"),
      month: formData.get("month"),
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
    const result = await createReportUpload({
      partnerId: BigInt(session.partnerId),
      userId: BigInt(session.userId),
      opcoId: BigInt(metadataResult.data.opcoId),
      year: metadataResult.data.year,
      month: metadataResult.data.month,
      filename: uploadFile.name,
      mimeType:
        uploadFile.type ||
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
      lineItems,
    });

    return NextResponse.json({
      reportId: result.reportId,
      lineItemCount: lineItems.length,
      message: "Report uploaded successfully",
    });
  } catch (error) {
    return jsonError(error, { storage: storageDiagnostics() });
  }
}
