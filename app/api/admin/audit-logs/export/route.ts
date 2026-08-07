/**
 * GET — Admin portal.
 * Export audit log entries as a downloadable file for compliance review.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  buildAuditLogCsv,
  listAuditLogsForExport,
  parseAuditLogListFilters,
} from "@/lib/admin/audit-logs";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseAuditLogListFilters(searchParams);
    const rows = await listAuditLogsForExport(filters);
    const csv = buildAuditLogCsv(rows);
    const stamp = new Date().toISOString().slice(0, 10);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audit-logs-${stamp}.csv"`,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to export audit logs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
