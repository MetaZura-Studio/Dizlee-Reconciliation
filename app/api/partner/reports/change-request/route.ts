/**
 * POST — Partner portal.
 * Request a correction or change to a submitted report period.
 */

import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import {
  ReportChangeRequestError,
  createReportChangeRequest,
} from "@/lib/partner/queries/change-request";
import { reportChangeRequestSchema } from "@/lib/partner/validation/change-request";

export async function POST(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as unknown;
    const parsed = reportChangeRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await createReportChangeRequest({
      partnerId: BigInt(session.partnerId),
      userId: BigInt(session.userId),
      reportId: BigInt(parsed.data.reportId),
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      changeRequestId: result.changeRequestId,
      message: "Reupload request submitted to Dizlee",
    });
  } catch (error) {
    if (error instanceof ReportChangeRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Partner report change request failed", error);
    return NextResponse.json(
      { error: "Failed to submit reupload request" },
      { status: 500 },
    );
  }
}
