/**
 * GET — Dizlee portal.
 * Return notification status tied to reconciliation lanes.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getLaneNotificationHistory } from "@/lib/dizlee/lane-report-notifications";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const opcoId = searchParams.get("opcoId");
    const partnerId = searchParams.get("partnerId");
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!opcoId || !partnerId) {
      return NextResponse.json(
        { error: "opcoId and partnerId are required." },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year) ||
      year < 2000
    ) {
      return jsonError(appErrorFromUnknown("Valid period is required.", 400));
    }

    const data = await getLaneNotificationHistory({
      opcoId,
      partnerId,
      month,
      year,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
