/**
 * GET — Admin portal.
 * List billing periods that have currency rate data.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { listRatePeriods } from "@/lib/admin/currency-rates";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const periods = await listRatePeriods();
    return NextResponse.json({ data: { periods } });
  } catch (error) {
    return jsonError(error);
  }
}
