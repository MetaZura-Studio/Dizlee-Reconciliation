import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get("invoiceId");

    if (invoiceId) {
      const data = await getInvoiceLifecycleDetail(invoiceId);
      if (!data) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
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
    const message =
      error instanceof Error ? error.message : "Failed to load invoice lifecycle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
