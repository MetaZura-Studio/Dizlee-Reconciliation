/**
 * GET, PATCH — Admin portal.
 * Read or update Dizlee invoice bank and signatory details.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getInvoiceBankDetailsView,
  updateInvoiceBankDetails,
} from "@/lib/admin/invoice-bank-details";
import type { UpdateInvoiceBankDetailsInput } from "@/lib/admin/validation/invoice-bank-details";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const data = await getInvoiceBankDetailsView();
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const body = (await request.json()) as UpdateInvoiceBankDetailsInput;
    const data = await updateInvoiceBankDetails(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
