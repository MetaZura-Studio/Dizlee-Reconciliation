/**
 * Authorized notification attachment download response — verifies recipient OpCo/Partner scope.
 */
import "server-only";

import { NextResponse } from "next/server";

import { buildFileResponseHeaders } from "@/lib/platform/file-response-headers";
import { prisma } from "@/lib/prisma";
import { readStoredObject } from "@/lib/platform/storage/object-storage";

export async function buildNotificationAttachmentDownloadResponse(params: {
  notificationId: bigint;
  attachmentId: bigint;
  recipientMatch: {
    userId: bigint;
    orgId: bigint;
    orgType: "OPCO" | "PARTNER";
  };
}): Promise<NextResponse> {
  const recipientWhere =
    params.recipientMatch.orgType === "OPCO"
      ? {
          isDeleted: false,
          OR: [
            {
              recipientType: { code: "USER" as const },
              recipientId: params.recipientMatch.userId,
            },
            {
              recipientType: { code: "OPCO" as const },
              recipientId: params.recipientMatch.orgId,
            },
          ],
        }
      : {
          isDeleted: false,
          OR: [
            {
              recipientType: { code: "USER" as const },
              recipientId: params.recipientMatch.userId,
            },
            {
              recipientType: { code: "PARTNER" as const },
              recipientId: params.recipientMatch.orgId,
            },
          ],
        };

  const attachment = await prisma.notificationAttachment.findFirst({
    where: {
      id: params.attachmentId,
      isDeleted: false,
      notificationId: params.notificationId,
      notification: {
        isDeleted: false,
        recipients: { some: recipientWhere },
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
    }),
  });
}
