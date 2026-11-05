/**
 * GET — Dizlee portal.
 * Download a pending OpCo-invoice supporting file (uploaded before create).
 * Only the uploader may download; files must live under invoices/.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";
import { readStoredObject } from "@/lib/platform/storage/object-storage";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  const { fileId } = await context.params;
  if (!/^\d+$/.test(fileId)) {
    return jsonError(appErrorFromUnknown("Invalid attachment id", 400));
  }

  try {
    const file = await prisma.file.findFirst({
      where: {
        id: BigInt(fileId),
        isDeleted: false,
        uploadedByUserId: BigInt(user.id),
        storageKey: { startsWith: "invoices/" },
      },
    });

    if (!file) {
      return jsonError(appErrorFromUnknown("Attachment not found", 404));
    }

    try {
      const buffer = await readStoredObject(file.storageKey);
      return new NextResponse(new Uint8Array(buffer), {
        headers: buildFileResponseHeaders({
          filename: file.filename,
          mimeType: file.mimeType ?? "application/octet-stream",
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
