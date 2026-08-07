/**
 * GET, PATCH — Admin portal.
 * Read or update Dizlee invoice bank and signatory details.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  getInvoiceBankDetailsView,
  InvoiceBankDetailsError,
  updateInvoiceBankDetails,
} from "@/lib/admin/invoice-bank-details";
import type { UpdateInvoiceBankDetailsInput } from "@/lib/admin/validation/invoice-bank-details";

export async function GET() {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await getInvoiceBankDetailsView();
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof InvoiceBankDetailsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to load invoice bank details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as UpdateInvoiceBankDetailsInput;
    const data = await updateInvoiceBankDetails(body, BigInt(user.id));
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof InvoiceBankDetailsError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to save invoice bank details";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
