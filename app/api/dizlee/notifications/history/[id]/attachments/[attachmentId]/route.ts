/**
 * GET — Dizlee Outbox.
 * Download an attachment from a sent notification (CLIENT-authored history only).
 */

import { NextResponse } from "next/server";

import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";
import { requireDizleeSession } from "@/lib/dizlee/auth";
import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";
import { prisma } from "@/lib/prisma";
import { readStoredObject } from "@/lib/platform/storage/object-storage";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireDizleeSession();
  if (!session) {
    return unauthorized();
  }

  const { id, attachmentId } = await context.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(attachmentId)) {
    return jsonError(appErrorFromUnknown("Invalid id", 400));
  }

  const attachment = await prisma.notificationAttachment.findFirst({
    where: {
      id: BigInt(attachmentId),
      isDeleted: false,
      notificationId: BigInt(id),
      notification: {
        isDeleted: false,
        status: { code: "SENT" },
        createdByUser: {
          role: { code: "CLIENT", lookupType: { code: "USER_ROLE" } },
        },
      },
    },
    include: {
      file: {
        select: {
          filename: true,
          storageKey: true,
          mimeType: true,
          isDeleted: true,
        },
      },
    },
  });

  if (!attachment || attachment.file.isDeleted) {
    return NextResponse.json({ error: "Attachment not found." }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await readStoredObject(attachment.file.storageKey);
  } catch {
    return NextResponse.json(
      { error: "Attachment file is not available." },
      { status: 404 },
    );
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: buildFileResponseHeaders({
      filename: attachment.file.filename,
      mimeType: attachment.file.mimeType,
      forceAttachment: true,
    }),
  });
}
