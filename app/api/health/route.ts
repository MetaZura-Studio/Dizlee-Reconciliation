/**
 * GET — Health portal.
 * Liveness check for load balancers and deployments.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Dizlee Reconciliation Platform API",
  });
}
