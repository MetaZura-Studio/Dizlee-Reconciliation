/**
 * POST — OpCo portal.
 * Hard mapped parse preview before monthly submission (no generic-parse fallback).
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getOpcoSession } from "@/lib/opco/auth";
import {
  OpcoUnlinkedPartnersError,
  parseOpcoMonthlyPartnerBuckets,
} from "@/lib/opco/queries/parse-monthly-buckets";
import { prisma } from "@/lib/prisma";
import { validateReportUploadFile } from "@/lib/opco/validation/report-upload";
import { assertExcelBufferMagic } from "@/lib/platform/excel-upload";
import { getOpcoReportFx } from "@/lib/platform/report-fx";

export async function POST(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
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

    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    const fx =
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      month >= 1 &&
      month <= 12
        ? await getOpcoReportFx({
            opcoId: BigInt(session.opcoId),
            month,
            year,
          })
        : undefined;

    const { buckets } = await parseOpcoMonthlyPartnerBuckets({
      opcoId: BigInt(session.opcoId),
      buffer,
    });

    const partnerIds = buckets.map((bucket) => bucket.partnerId);
    const partners = await prisma.partner.findMany({
      where: { id: { in: partnerIds }, isDeleted: false },
      select: { id: true, name: true },
    });
    const nameById = new Map(
      partners.map((partner) => [partner.id.toString(), partner.name]),
    );

    const partnerSummaries = buckets.map((bucket) => {
      const amount = bucket.lineItems.reduce(
        (sum, line) => sum + (line.amount ?? 0),
        0,
      );
      return {
        partnerId: bucket.partnerId.toString(),
        partnerName:
          nameById.get(bucket.partnerId.toString()) ??
          `Partner ${bucket.partnerId.toString()}`,
        lineItemCount: bucket.lineItems.length,
        totalAmount: amount,
      };
    });

    const lineItemCount = partnerSummaries.reduce(
      (sum, row) => sum + row.lineItemCount,
      0,
    );

    return NextResponse.json({
      data: {
        filename: uploadFile.name,
        lineItemCount,
        currencyCode: fx?.currencyCode ?? null,
        partners: partnerSummaries,
      },
    });
  } catch (error) {
    if (error instanceof OpcoUnlinkedPartnersError) {
      return NextResponse.json(
        {
          error: "OPCO_UNLINKED_PARTNERS_IN_FILE",
          details: error.unmatched,
        },
        { status: 409 },
      );
    }
    return jsonError(error);
  }
}
