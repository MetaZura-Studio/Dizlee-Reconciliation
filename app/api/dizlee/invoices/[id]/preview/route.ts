/**
 * GET — Dizlee portal.
 * Return HTML or document preview data for an invoice.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { prisma } from "@/lib/prisma";
import { readStoredObject } from "@/lib/platform/storage/object-storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: BigInt(id) },
      include: { file: true },
    });

    if (!invoice?.file) {
      return jsonError(appErrorFromUnknown("File not found", 404));
    }

    try {
      const buffer = await readStoredObject(invoice.file.storageKey);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": invoice.file.mimeType ?? "application/octet-stream",
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
    return jsonError(error);
  }
}
