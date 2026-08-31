/**
 * POST — OpCo portal.
 * Replace the monthly raw Excel after Dizlee approves a submission change request.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appError, appErrorFromUnknown } from "@/lib/errors/app-error";

import { getOpcoSession } from "@/lib/opco/auth";
import {
  OpcoMonthlyParseError,
  OpcoUnlinkedPartnersError,
} from "@/lib/opco/queries/parse-monthly-buckets";
import { reuploadOpcoMonthlySubmission } from "@/lib/opco/queries/reupload-submission";
import { validateReportUploadFile } from "@/lib/opco/validation/report-upload";
import { assertExcelBufferMagic } from "@/lib/platform/excel-upload";

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
    return jsonError(appErrorFromUnknown("Invalid submission id", 400));
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

    const mimeType =
      uploadFile.type ||
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const result = await reuploadOpcoMonthlySubmission({
      opcoId: BigInt(session.opcoId),
      userId: BigInt(session.userId),
      submissionId: BigInt(id),
      filename: uploadFile.name,
      mimeType,
      buffer,
    });

    return NextResponse.json({
      submissionId: result.submissionId,
      partnerCount: result.partnerCount,
      lineItemCount: result.lineItemCount,
      message: "Monthly report reuploaded successfully",
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
