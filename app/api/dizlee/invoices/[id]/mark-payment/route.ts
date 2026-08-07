/**
 * POST — Dizlee portal.
 * Record payment/settlement for Dizlee → OpCo or Partner → Dizlee invoices.
 */

import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  InvoiceActionError,
  markInvoicePaymentDone,
} from "@/lib/dizlee/invoices";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const data = await markInvoicePaymentDone(id, user.id);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof InvoiceActionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to mark payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
