/**
 * POST — OpCo portal.
 * Ask Admin to configure Report map for this OpCo.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, unauthorized, validationFailed } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import { requestReportMapFromOpco } from "@/lib/opco/queries/report-map-request";

const bodySchema = z.object({
  message: z.string().trim().max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  const session = await getOpcoSession();
  if (!session) {
    return unauthorized();
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      raw = {};
    }

    const parsed = bodySchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten().fieldErrors);
    }

    const result = await requestReportMapFromOpco({
      opcoId: BigInt(session.opcoId),
      userId: BigInt(session.userId),
      message: parsed.data.message,
    });

    return NextResponse.json({
      data: {
        alreadyPending: result.alreadyPending,
        message: result.alreadyPending
          ? "A report map request is already pending with Admin."
          : "Admin has been notified to configure Report map.",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
