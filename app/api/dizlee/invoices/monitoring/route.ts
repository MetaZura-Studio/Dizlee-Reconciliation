/**
 * GET — Dizlee portal.
 * Return invoice submission and status metrics for monitoring views.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getInvoiceFilterOptions,
  listInvoiceMonitoringLanes,
  parseInvoiceMonitoringFilters,
} from "@/lib/dizlee/invoices-monitoring";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const message =
      error instanceof Error ? error.message : "Failed to load invoice monitoring";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
