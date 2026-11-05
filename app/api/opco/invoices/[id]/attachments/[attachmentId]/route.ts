/**
 * GET — OpCo portal.
 * Download a supporting attachment for an invoice belonging to this OpCo.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getOpcoSession } from "@/lib/opco/auth";
import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";
import { readStoredObject } from "@/lib/platform/storage/object-storage";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getOpcoSession();
  if (!session) {
    return unauthorized();
  }

  const { id, attachmentId } = await context.params;

  if (!/^\d+$/.test(id) || !/^\d+$/.test(attachmentId)) {
    return jsonError(appErrorFromUnknown("Invalid attachment id", 400));
  }

  try {
    const attachment = await prisma.invoiceAttachment.findFirst({
      where: {
        id: BigInt(attachmentId),
        invoiceId: BigInt(id),
        isDeleted: false,
        invoice: {
          isDeleted: false,
          opcoId: BigInt(session.opcoId),
          invoiceType: { code: "CLIENT_TO_OPCO" },
        },
      },
      include: {
        file: true,
      },
    });

    if (!attachment?.file || attachment.file.isDeleted) {
      return jsonError(appErrorFromUnknown("Attachment not found", 404));
    }

    try {
      const buffer = await readStoredObject(attachment.file.storageKey);
      return new NextResponse(new Uint8Array(buffer), {
        headers: buildFileResponseHeaders({
          filename: attachment.file.filename,
          mimeType: attachment.file.mimeType ?? "application/octet-stream",
          forceAttachment: true,
        }),
      });
    } catch {
      return NextResponse.json(
        { error: "Attachment file is not available in storage." },
        { status: 404 },
      );
    }
  } catch (error) {
    return jsonError(error);
  }
}
