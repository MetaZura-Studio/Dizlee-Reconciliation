/**
 * GET — Dizlee portal.
 * Return metadata and status for a single report.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getReportDetail } from "@/lib/dizlee/reports";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  try {
    const data = await getReportDetail(id);
    if (!data) {
      return jsonError(appErrorFromUnknown("Report not found", 404));
    }
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
