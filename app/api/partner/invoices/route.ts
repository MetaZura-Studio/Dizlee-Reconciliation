/**
 * GET — Partner portal.
 * List invoices for the signed-in partner.
 */

import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import {
  getPartnerInvoiceFilterOptions,
  parsePartnerInvoiceListFilters,
  searchInvoicesForPartner,
} from "@/lib/partner/queries/invoices";

export async function GET(request: Request) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const partnerId = BigInt(session.partnerId);
  const filters = parsePartnerInvoiceListFilters(new URL(request.url).searchParams);

  const [result, filterOptions] = await Promise.all([
    searchInvoicesForPartner(partnerId, filters),
    getPartnerInvoiceFilterOptions(),
  ]);

  return NextResponse.json({ result, filterOptions });
}
