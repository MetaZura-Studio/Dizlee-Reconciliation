/**
 * GET — OpCo portal.
 * Whether Report map is configured and if a map request is already pending.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import { getOpcoUploadReadiness } from "@/lib/opco/queries/report-map-request";

export async function GET() {
  const session = await getOpcoSession();
  if (!session) {
    return unauthorized();
  }

  try {
    const data = await getOpcoUploadReadiness(BigInt(session.opcoId));
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
