import { NextResponse } from "next/server";

import { ReportParseError, parseReportWorkbook } from "@/lib/partner/excel/parse-report";
import { getPartnerSession } from "@/lib/partner/auth";
import {
  ReportReuploadError,
  reuploadCorrectedReport,
} from "@/lib/partner/queries/reupload-report";
import { validateReportUploadFile } from "@/lib/partner/validation/report-upload";
import {
  ObjectStorageError,
  storageDiagnostics,
} from "@/lib/platform/storage/object-storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getPartnerSession();

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
    if (error instanceof ReportParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof ReportReuploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof ObjectStorageError) {
      return NextResponse.json(
        { error: error.message, storage: storageDiagnostics() },
        { status: 503 },
      );
    }

    console.error("Partner report reupload failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Failed to reupload report: ${error.message}`
            : "Failed to reupload report",
        storage: storageDiagnostics(),
      },
      { status: 500 },
    );
  }
}
