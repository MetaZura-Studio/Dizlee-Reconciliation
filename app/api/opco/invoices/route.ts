/**
 * GET — OpCo portal.
 * List invoices addressed to the signed-in OpCo.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { getOpcoSession } from "@/lib/opco/auth";
import {
  getOpcoInvoiceFilterOptions,
  parseOpcoInvoiceListFilters,
  searchInvoicesForOpco,
} from "@/lib/opco/queries/invoices";

export async function GET(request: Request) {
  const session = await getOpcoSession();

  if (!session) {
    return unauthorized();
  }

  const opcoId = BigInt(session.opcoId);
  const filters = parseOpcoInvoiceListFilters(
    new URL(request.url).searchParams,
  );

  const [result, filterOptions] = await Promise.all([
    searchInvoicesForOpco(opcoId, filters),
    getOpcoInvoiceFilterOptions(),
  ]);

  return NextResponse.json({ result, filterOptions });
}
