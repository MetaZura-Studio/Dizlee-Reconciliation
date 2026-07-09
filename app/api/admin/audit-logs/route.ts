import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getAuditLogFilterOptions,
  listAuditLogs,
  parseAuditLogListFilters,
} from "@/lib/admin/audit-logs";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const message =
      error instanceof Error ? error.message : "Failed to load audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
