/**
 * POST — Partner portal.
 * Parse an uploaded report file and return validation preview before submit.
 */

import { NextResponse } from "next/server";

import { ReportParseError, parseReportWorkbook } from "@/lib/partner/excel/parse-report";
import { getPartnerSession } from "@/lib/partner/auth";
import { validateReportUploadFile } from "@/lib/partner/validation/report-upload";
import { mapParsedLinesToPreview } from "@/lib/platform/report-preview";

export async function POST(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    return NextResponse.json({
      filename: uploadFile.name,
      lineItemCount: lineItems.length,
      lineItems: mapParsedLinesToPreview(lineItems),
    });
  } catch (error) {
    if (error instanceof ReportParseError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Partner report parse preview failed", error);
    return NextResponse.json({ error: "Failed to parse report" }, { status: 500 });
  }
}
