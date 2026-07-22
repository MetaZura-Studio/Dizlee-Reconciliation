import "server-only";

import { resolveDownloadMimeType } from "@/lib/platform/file-response-headers";
import { saveNotificationFileLocally } from "@/lib/platform/storage/save-notification-file";
import { prisma } from "@/lib/prisma";

export const MAX_NOTIFICATION_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const MAX_NOTIFICATION_ATTACHMENTS = 5;

export class NotificationAttachmentError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "NotificationAttachmentError";
    this.status = status;
  }
}

export function validateNotificationAttachmentFile(
  file: File,
): { filename: string; mimeType: string } {
  const filename = file.name.trim();
  if (!filename) {
    throw new NotificationAttachmentError("File name is required.");
  }
  if (file.size <= 0) {
    throw new NotificationAttachmentError("File is empty.");
  }
  if (file.size > MAX_NOTIFICATION_ATTACHMENT_BYTES) {
    throw new NotificationAttachmentError(
      "Each attachment must be 10 MB or smaller.",
    );
  }

  return {
    filename,
    mimeType: resolveDownloadMimeType(filename, file.type),
  };
}

export async function createNotificationAttachmentFile(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  userId: bigint;
}): Promise<{ fileId: string; filename: string }> {
  const saved = await saveNotificationFileLocally({
    buffer: params.buffer,
    filename: params.filename,
    mimeType: params.mimeType,
  });

  const file = await prisma.file.create({
    data: {
      filename: params.filename,
      storageKey: saved.storageKey,
      mimeType: params.mimeType,
      sizeBytes: saved.sizeBytes,
      checksum: saved.checksum,
      uploadedByUserId: params.userId,
      updatedByUserId: params.userId,
    },
    select: { id: true, filename: true },
  });

  return {
    fileId: file.id.toString(),
    filename: file.filename,
  };
}

export async function resolveNotificationAttachmentCreates(params: {
  attachmentFileIds: string[];
  userId: bigint;
}): Promise<Array<{ fileId: bigint }>> {
  const uniqueIds = [
    ...new Set(params.attachmentFileIds.map((id) => id.trim())),
  ].filter(Boolean);

  if (uniqueIds.length === 0) {
    return [];
  }

  if (uniqueIds.length > MAX_NOTIFICATION_ATTACHMENTS) {
    throw new NotificationAttachmentError(
      `At most ${MAX_NOTIFICATION_ATTACHMENTS} attachments are allowed.`,
    );
  }

  const files = await prisma.file.findMany({
    where: {
      id: { in: uniqueIds.map((id) => BigInt(id)) },
      isDeleted: false,
      uploadedByUserId: params.userId,
      storageKey: { startsWith: "notifications/" },
    },
    select: { id: true },
  });

  if (files.length !== uniqueIds.length) {
    throw new NotificationAttachmentError(
      "One or more attachments are invalid or no longer available.",
    );
  }

  return files.map((file) => ({ fileId: file.id }));
}

export function notificationAttachmentCreateInput(
  attachmentCreates: Array<{ fileId: bigint }>,
  userId: bigint,
) {
  if (attachmentCreates.length === 0) {
    return undefined;
  }

  return {
    create: attachmentCreates.map(({ fileId }) => ({
      fileId,
      createdByUserId: userId,
      updatedByUserId: userId,
    })),
  };
}
