/**
 * Notification attachment validation, file records, and Prisma create helpers.
 * Limits: 10 MB per file, five attachments; stored under notifications folder in object storage.
 * Allowlisted types only — SVG/HTML/JS rejected to prevent stored XSS on download.
 */
import "server-only";

import { resolveDownloadMimeType, fileExtension } from "@/lib/platform/file-response-headers";
import { resolveAllowedNotificationAttachmentMime } from "@/lib/platform/notification-attachment-allowlist";
import { MAX_NOTIFICATION_ATTACHMENTS } from "@/lib/platform/notification-attachments.shared";
import { saveNotificationFileLocally } from "@/lib/platform/storage/save-notification-file";
import { assertExcelBufferMagic } from "@/lib/platform/excel-upload";
import { assertPdfBufferMagic } from "@/lib/partner/validation/invoice-upload";
import { prisma } from "@/lib/prisma";
import { DomainError } from "@/lib/errors/app-error";

export const MAX_NOTIFICATION_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export {
  ATTACHMENT_TYPE_NOT_ALLOWED_MESSAGE,
  MAX_NOTIFICATION_ATTACHMENTS,
  NOTIFICATION_ATTACHMENT_ACCEPT,
  NOTIFICATION_ATTACHMENT_MIME_BY_EXT,
} from "@/lib/platform/notification-attachments.shared";

export class NotificationAttachmentError extends DomainError {
  constructor(keyOrMessage: string, status?: number) {
    super("NotificationAttachmentError", keyOrMessage, status);
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

  const allowed = resolveAllowedNotificationAttachmentMime({
    filename,
    clientMimeType: file.type,
  });
  if ("error" in allowed) {
    throw new NotificationAttachmentError(allowed.error);
  }

  return {
    filename,
    mimeType: resolveDownloadMimeType(filename, allowed.mimeType),
  };
}

/** Magic-byte / content checks for allowlisted attachment types. */
export function assertNotificationAttachmentMagic(
  buffer: Buffer,
  filename: string,
): string | null {
  const ext = fileExtension(filename);
  if (ext === "pdf") {
    return assertPdfBufferMagic(buffer);
  }
  if (ext === "xlsx" || ext === "xls") {
    return assertExcelBufferMagic(buffer, filename);
  }
  if (ext === "png") {
    if (
      buffer.length < 8 ||
      buffer[0] !== 0x89 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x4e ||
      buffer[3] !== 0x47
    ) {
      return "File content is not a valid PNG image";
    }
    return null;
  }
  if (ext === "jpg" || ext === "jpeg") {
    if (buffer.length < 3 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
      return "File content is not a valid JPEG image";
    }
    return null;
  }
  if (ext === "gif") {
    const header = buffer.subarray(0, 6).toString("ascii");
    if (header !== "GIF87a" && header !== "GIF89a") {
      return "File content is not a valid GIF image";
    }
    return null;
  }
  if (ext === "webp") {
    if (
      buffer.length < 12 ||
      buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
      buffer.subarray(8, 12).toString("ascii") !== "WEBP"
    ) {
      return "File content is not a valid WEBP image";
    }
    return null;
  }
  if (ext === "bmp") {
    if (buffer.length < 2 || buffer[0] !== 0x42 || buffer[1] !== 0x4d) {
      return "File content is not a valid BMP image";
    }
    return null;
  }
  // csv/txt — no reliable magic; extension allowlist already applied
  return null;
}

export async function createNotificationAttachmentFile(params: {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  userId: bigint;
}): Promise<{ fileId: string; filename: string }> {
  const magicError = assertNotificationAttachmentMagic(
    params.buffer,
    params.filename,
  );
  if (magicError) {
    throw new NotificationAttachmentError(magicError, 400);
  }

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
