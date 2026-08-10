/**
 * POST — OpCo portal.
 * Request a correction or change to a submitted report period.
 */

import { NextResponse } from "next/server";
import {
  jsonError,
  unauthorized,
  validationFailed,
} from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import { createReportChangeRequest } from "@/lib/opco/queries/change-request";
import { reportChangeRequestSchema } from "@/lib/opco/validation/change-request";

export async function POST(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as unknown;
    const parsed = reportChangeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return validationFailed(parsed.error.flatten().fieldErrors);
    }

    const result = await createReportChangeRequest({
      opcoId: BigInt(session.opcoId),
      userId: BigInt(session.userId),
      reportId: BigInt(parsed.data.reportId),
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      changeRequestId: result.changeRequestId,
      message: "Reupload request submitted to Dizlee",
    });
  } catch (error) {
    return jsonError(error);
  }
}
