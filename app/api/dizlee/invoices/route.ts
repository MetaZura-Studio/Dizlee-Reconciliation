import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getInvoiceFilterOptions,
  listInvoices,
  parseInvoiceListFilters,
} from "@/lib/dizlee/invoices";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseInvoiceListFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      listInvoices(filters),
      getInvoiceFilterOptions(),
    ]);

    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load invoices";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
