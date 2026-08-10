/**
 * GET — Dizlee portal.
 * Return invoice submission and status metrics for monitoring views.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getInvoiceFilterOptions,
  listInvoiceMonitoringLanes,
  parseInvoiceMonitoringFilters,
} from "@/lib/dizlee/invoices-monitoring";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseInvoiceMonitoringFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      listInvoiceMonitoringLanes(filters),
      getInvoiceFilterOptions(),
    ]);

    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    return jsonError(error);
  }
}
