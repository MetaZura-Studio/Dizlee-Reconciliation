import { NextResponse } from "next/server";

import { ReportParseError, parseReportWorkbook } from "@/lib/opco/excel/parse-report";
import { getOpcoSession } from "@/lib/opco/auth";
import {
  ReportUploadError,
  createReportUpload,
} from "@/lib/opco/queries/upload-report";
import {
  reportUploadMetadataSchema,
  validateReportUploadFile,
} from "@/lib/opco/validation/report-upload";

export async function POST(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const metadataResult = reportUploadMetadataSchema.safeParse({
      partnerId: formData.get("partnerId"),
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
      file instanceof File ? validateReportUploadFile(file) : "Excel file is required";

    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
    }

    const uploadFile = file as File;
    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const lineItems = await parseReportWorkbook(buffer);
    const result = await createReportUpload({
      opcoId: BigInt(session.opcoId),
      userId: BigInt(session.userId),
      partnerId: BigInt(metadataResult.data.partnerId),
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
    if (error instanceof ReportParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ReportUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Report upload failed", error);
    return NextResponse.json({ error: "Failed to upload report" }, { status: 500 });
  }
}
