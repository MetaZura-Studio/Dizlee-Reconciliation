/**
 * GET, POST — Dizlee portal.
 * List invoices or create a Dizlee digital invoice for an OpCo.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  jsonError,
  unauthorized,
  validationFailed,
} from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  createOpcoInvoice,
  getCreateOpcoInvoiceFormOptions,
  getInvoiceFilterOptions,
  listInvoices,
  parseInvoiceListFilters,
} from "@/lib/dizlee/invoices";
import { createOpcoInvoiceBodySchema } from "@/lib/dizlee/validation/api-bodies";

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
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return validationFailed();
    }

    const parsed = createOpcoInvoiceBodySchema.safeParse(raw);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten().fieldErrors);
    }

    const data = await createOpcoInvoice(parsed.data, user.id);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
