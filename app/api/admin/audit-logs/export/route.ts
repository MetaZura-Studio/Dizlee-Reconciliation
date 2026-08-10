/**
 * GET — Admin portal.
 * Export audit log entries as a downloadable file for compliance review.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  buildAuditLogCsv,
  listAuditLogsForExport,
  parseAuditLogListFilters,
} from "@/lib/admin/audit-logs";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
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
    return jsonError(error);
  }
}
