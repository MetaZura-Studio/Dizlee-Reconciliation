import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import { getPartnerInvoiceDetail } from "@/lib/partner/queries/invoices";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const detail = await getPartnerInvoiceDetail(
    BigInt(session.partnerId),
    BigInt(id),
  );

  if (!detail) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({ detail });
}
