/**
 * POST — OpCo portal.
 * Request Dizlee approval to reupload a monthly multi-partner report file.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import { createOpcoSubmissionChangeRequest } from "@/lib/opco/queries/submission-change-request";
import { submissionChangeRequestSchema } from "@/lib/opco/validation/submission-change-request";

export async function POST(request: Request) {
  const session = await getOpcoSession();
  if (!session) {
    return unauthorized();
  }

  try {
    const body = await request.json();
    const parsed = submissionChangeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    if (!/^\d+$/.test(parsed.data.submissionId)) {
      return NextResponse.json(
        { error: "Invalid submission id" },
        { status: 400 },
      );
    }

    const result = await createOpcoSubmissionChangeRequest({
      opcoId: BigInt(session.opcoId),
      userId: BigInt(session.userId),
      submissionId: BigInt(parsed.data.submissionId),
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      changeRequestId: result.changeRequestId,
      message: "Reupload request submitted",
    });
  } catch (error) {
    return jsonError(error);
  }
}
