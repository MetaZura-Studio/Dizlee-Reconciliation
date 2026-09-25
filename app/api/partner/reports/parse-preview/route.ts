/**
 * POST — Partner portal.
 * Parse an uploaded report file and return validation preview before submit.
 * Applies per-row FX from Currency / Local Currency (LC) using Admin monthly rates.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { parseReportWorkbook } from "@/lib/partner/excel/parse-report";
import { getPartnerSession } from "@/lib/partner/auth";
import { validateReportUploadFile } from "@/lib/partner/validation/report-upload";
import { assertExcelBufferMagic } from "@/lib/platform/excel-upload";
import { assertPartnerPortalReportWorkbook } from "@/lib/platform/excel/report-workbook-kind";
import {
  applyPartnerPerRowFx,
  getMonthlyRatesByIso,
} from "@/lib/platform/report-fx";
import { mapParsedLinesToPreview } from "@/lib/platform/report-preview";

export async function POST(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const yearRaw = formData.get("year");
    const monthRaw = formData.get("month");
    const year = Number(yearRaw);
    const month = Number(monthRaw);
    const fileError =
      file instanceof File
        ? validateReportUploadFile(file)
        : "Excel file is required";

    if (fileError) {
      return jsonError(appErrorFromUnknown(fileError, 400));
    }

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return jsonError(
        appErrorFromUnknown("Report period (month/year) is required", 400),
      );
    }

    const uploadFile = file as File;
    const buffer = Buffer.from(await uploadFile.arrayBuffer());
    const magicError = assertExcelBufferMagic(buffer, uploadFile.name);
    if (magicError) {
      return jsonError(appErrorFromUnknown(magicError, 400));
    }
    await assertPartnerPortalReportWorkbook(buffer);
    const parsed = await parseReportWorkbook(buffer);
    const lineItems = await applyPartnerPerRowFx(parsed, month, year);
    const ratesByIso = await getMonthlyRatesByIso(month, year);
    const preview = mapParsedLinesToPreview(lineItems, undefined, ratesByIso);

    return NextResponse.json({
      filename: uploadFile.name,
      lineItemCount: lineItems.length,
      lineItems: preview,
      currencyCode: "USD",
    });
  } catch (error) {
    return jsonError(error);
  }
}
