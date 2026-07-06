import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  createOpcoInvoice,
  getCreateOpcoInvoiceFormOptions,
  getInvoiceFilterOptions,
  InvoiceActionError,
  listInvoices,
  parseInvoiceListFilters,
  type CreateOpcoInvoiceInput,
} from "@/lib/dizlee/invoices";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("form") === "create") {
      const formOptions = await getCreateOpcoInvoiceFormOptions();
      return NextResponse.json({ data: formOptions });
    }

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

export async function POST(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CreateOpcoInvoiceInput;
    const data = await createOpcoInvoice(body, user.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof InvoiceActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to create invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
