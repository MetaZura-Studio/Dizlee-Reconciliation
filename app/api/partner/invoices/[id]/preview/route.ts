/**
 * GET — Partner portal.
 * Return preview content for a partner-submitted invoice.
 */

import { NextResponse } from "next/server";

import { getPartnerSession } from "@/lib/partner/auth";
import prisma from "@/lib/prisma";
import { readStoredObject } from "@/lib/platform/storage/object-storage";

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

  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: BigInt(id),
        partnerId: BigInt(session.partnerId),
        invoiceType: { code: "PARTNER_TO_CLIENT" },
        isDeleted: false,
      },
      include: { file: true },
    });

    if (!invoice?.file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    try {
      const buffer = await readStoredObject(invoice.file.storageKey);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": invoice.file.mimeType ?? "application/pdf",
          "Content-Disposition": `inline; filename="${invoice.file.filename}"`,
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Invoice file is not available in storage." },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Partner invoice preview failed", error);
    return NextResponse.json({ error: "Failed to load invoice preview" }, { status: 500 });
  }
}
