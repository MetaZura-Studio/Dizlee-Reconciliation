/**
 * GET — Admin portal.
 * Distinct sample values for a mapped filter column (Row filters Equals picker).
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { getOpcoReportMappingColumnValues } from "@/lib/admin/opco-report-mappings";
import { jsonError, unauthorized } from "@/lib/errors/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const column = new URL(request.url).searchParams.get("column")?.trim() ?? "";
    const result = await getOpcoReportMappingColumnValues(id, column);
    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
