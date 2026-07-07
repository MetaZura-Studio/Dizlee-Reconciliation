import { NextResponse } from "next/server";

import { ReportParseError, parseReportWorkbook } from "@/lib/opco/excel/parse-report";
import { getOpcoSession } from "@/lib/opco/auth";
import {
  ReportReuploadError,
  reuploadCorrectedReport,
} from "@/lib/opco/queries/reupload-report";
import { validateReportUploadFile } from "@/lib/opco/validation/report-upload";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid report id" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const fileError =
      file instanceof File ? validateReportUploadFile(file) : "Excel file is required";

    if (fileError) {
      return NextResponse.json({ error: fileError }, { status: 400 });
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
    if (error instanceof ReportParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ReportReuploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Report reupload failed", error);
    return NextResponse.json({ error: "Failed to reupload report" }, { status: 500 });
  }
}
