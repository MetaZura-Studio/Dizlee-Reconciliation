/**
 * GET — Admin portal.
 * Return paginated outbound email delivery log entries.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getEmailDeliveryFilterOptions,
  listEmailDeliveries,
  parseEmailDeliveryListFilters,
} from "@/lib/admin/email-delivery";
import { jsonError, unauthorized } from "@/lib/errors/respond";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("options") === "1") {
      return NextResponse.json({ data: getEmailDeliveryFilterOptions() });
    }

    const filters = parseEmailDeliveryListFilters(searchParams);
    const data = await listEmailDeliveries(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
