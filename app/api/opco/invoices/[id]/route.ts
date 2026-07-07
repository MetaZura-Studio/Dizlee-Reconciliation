import { NextResponse } from "next/server";

import { getOpcoSession } from "@/lib/opco/auth";
import { getOpcoInvoiceDetailForViewer } from "@/lib/opco/queries/invoices";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getOpcoSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid invoice id" }, { status: 400 });
  }

  const result = await getOpcoInvoiceDetailForViewer(
    BigInt(session.opcoId),
    BigInt(id),
    BigInt(session.userId),
  );

  if (!result) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json({
    detail: result.detail,
    acknowledged: result.acknowledged,
  });
}
