/**
 * GET — Partner portal.
 * Return preview content for a partner-submitted invoice.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getPartnerSession } from "@/lib/partner/auth";
import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";
import prisma from "@/lib/prisma";
import { readStoredObject } from "@/lib/platform/storage/object-storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return jsonError(appErrorFromUnknown("Invalid invoice id", 400));
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
      return jsonError(appErrorFromUnknown("File not found", 404));
    }

    try {
      const buffer = await readStoredObject(invoice.file.storageKey);
      return new NextResponse(new Uint8Array(buffer), {
        headers: buildFileResponseHeaders({
          filename: invoice.file.filename,
          mimeType: invoice.file.mimeType ?? "application/pdf",
        }),
      });
    } catch {
      return NextResponse.json(
        { error: "Invoice file is not available in storage." },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("Partner invoice preview failed", error);
    return jsonError(
      appErrorFromUnknown("Failed to load invoice preview", 500),
    );
  }
}
