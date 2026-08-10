/**
 * GET — Dizlee portal.
 * List invoices grouped by lifecycle stage for pipeline monitoring.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getInvoiceFilterOptions,
  getInvoiceLifecycleDetail,
  listLifecycleInvoices,
  parseLifecycleListFilters,
} from "@/lib/dizlee/invoice-lifecycle";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    if (invoiceId) {
      const data = await getInvoiceLifecycleDetail(invoiceId);
      if (!data) {
        return jsonError(appErrorFromUnknown("Invoice not found", 404));
      }
      return NextResponse.json({ data });
    }

    const filters = parseLifecycleListFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      listLifecycleInvoices(filters),
      getInvoiceFilterOptions(),
    ]);

    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    return jsonError(error);
  }
}
