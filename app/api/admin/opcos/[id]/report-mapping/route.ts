/**
 * GET, PATCH — Admin portal.
 * Load or update OpCo report column mapping / selected sample sheet.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getOpcoReportMapping,
  selectOpcoReportMappingSheet,
  updateOpcoReportMapping,
} from "@/lib/admin/opco-report-mappings";
import type {
  SelectOpcoReportMappingSheetInput,
  UpdateOpcoReportMappingInput,
} from "@/lib/admin/validation/opco-report-mappings";
import { jsonError, unauthorized } from "@/lib/errors/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const mapping = await getOpcoReportMapping(id);
    return NextResponse.json({ data: mapping });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const body = (await request.json()) as Record<string, unknown>;

    if (
      typeof body.sampleSheetName === "string" &&
      body.serviceColumn === undefined &&
      body.partnerMode === undefined
    ) {
      const mapping = await selectOpcoReportMappingSheet(
        id,
        body as SelectOpcoReportMappingSheetInput,
        BigInt(user.id),
      );
      return NextResponse.json({ data: mapping });
    }

    const mapping = await updateOpcoReportMapping(
      id,
      body as UpdateOpcoReportMappingInput,
      BigInt(user.id),
    );
    return NextResponse.json({ data: mapping });
  } catch (error) {
    return jsonError(error);
  }
}
