import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { getInvoiceDetail } from "@/lib/dizlee/invoices";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const data = await getInvoiceDetail(id);
    if (!data) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load invoice";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
