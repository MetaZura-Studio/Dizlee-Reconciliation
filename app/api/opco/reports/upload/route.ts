/**
 * POST — OpCo portal.
 * Upload one monthly multi-partner Excel; split into partner reports under one submission.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appError, appErrorFromUnknown } from "@/lib/errors/app-error";

import { getOpcoSession } from "@/lib/opco/auth";
import { createOpcoMonthlySubmissionUpload } from "@/lib/opco/queries/upload-report";
import {
  OpcoMonthlyParseError,
  OpcoUnlinkedPartnersError,
  parseOpcoMonthlyPartnerBuckets,
} from "@/lib/opco/queries/parse-monthly-buckets";
import {
  reportUploadLookupMetadataSchema,
  validateReportUploadFile,
} from "@/lib/opco/validation/report-upload";
import { assertExcelBufferMagic } from "@/lib/platform/excel-upload";

export async function POST(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const opcoId = BigInt(session.opcoId);
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

    const metadataResult = reportUploadLookupMetadataSchema.safeParse({
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

    const mimeType =
      uploadFile.type ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const { buckets } = await parseOpcoMonthlyPartnerBuckets({
      opcoId,
      buffer,
    });

    if (buckets.length === 0) {
      return jsonError(
        appErrorFromUnknown("No partner rows found in the uploaded file", 400),
      );
    }

    const result = await createOpcoMonthlySubmissionUpload({
      opcoId,
      userId: BigInt(session.userId),
      year: metadataResult.data.year,
      month: metadataResult.data.month,
      filename: uploadFile.name,
      mimeType,
      buffer,
      buckets,
    });

    return NextResponse.json({
      submissionId: result.submissionId,
      reportId: result.reportIds[0] ?? "",
      reportIds: result.reportIds,
      lineItemCount: result.lineItemCount,
      partnerCount: result.reportIds.length,
      message: "Report uploaded successfully",
    });
  } catch (error) {
    if (error instanceof OpcoUnlinkedPartnersError) {
      return jsonError(appError("OPCO_UNLINKED_PARTNERS_IN_FILE"), error.unmatched);
    }
    if (error instanceof OpcoMonthlyParseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status ?? 400 },
      );
    }
    return jsonError(error);
  }
}
