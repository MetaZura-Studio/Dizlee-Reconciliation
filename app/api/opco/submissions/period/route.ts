/**
 * GET — OpCo portal.
 * Period submission status for Upload Report early gate (exists / request / reupload).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import { getOpcoSubmissionForPeriod } from "@/lib/opco/queries/submissions";

export async function GET(request: NextRequest) {
  const session = await getOpcoSession();
  if (!session) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = Number(searchParams.get("year"));
    const month = Number(searchParams.get("month"));

    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      return NextResponse.json(
        { error: "Invalid year or month" },
        { status: 400 },
      );
    }

    const data = await getOpcoSubmissionForPeriod(
      BigInt(session.opcoId),
      year,
      month,
    );
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
