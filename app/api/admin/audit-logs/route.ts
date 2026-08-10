/**
 * GET — Admin portal.
 * Return paginated audit log entries with optional filters.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getAuditLogFilterOptions,
  listAuditLogs,
  parseAuditLogListFilters,
} from "@/lib/admin/audit-logs";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("options") === "1") {
      const options = await getAuditLogFilterOptions();
      return NextResponse.json({ data: options });
    }

    const filters = parseAuditLogListFilters(searchParams);
    const data = await listAuditLogs(filters);
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
