/**
 * GET, POST — Dizlee portal.
 * List invoices or create a Dizlee digital invoice for an OpCo.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  createOpcoInvoice,
  getCreateOpcoInvoiceFormOptions,
  getInvoiceFilterOptions,
  listInvoices,
  parseInvoiceListFilters,
  type CreateOpcoInvoiceInput,
} from "@/lib/dizlee/invoices";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get("form") === "create") {
      const monthRaw = searchParams.get("month");
      const yearRaw = searchParams.get("year");
      const month =
        monthRaw && /^\d+$/.test(monthRaw) ? Number(monthRaw) : undefined;
      const year =
        yearRaw && /^\d+$/.test(yearRaw) ? Number(yearRaw) : undefined;
      const formOptions = await getCreateOpcoInvoiceFormOptions({
        month,
        year,
      });
      return NextResponse.json({ data: formOptions });
    }

    const filters = parseInvoiceListFilters(searchParams);
    const [data, filterOptions] = await Promise.all([
      listInvoices(filters),
      getInvoiceFilterOptions(),
    ]);

    return NextResponse.json({ data, filterOptions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as CreateOpcoInvoiceInput;
    const data = await createOpcoInvoice(body, user.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
