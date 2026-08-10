/**
 * POST — Dizlee portal.
 * Upload an attachment for use in Dizlee broadcast notifications.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  createNotificationAttachmentFile,
  validateNotificationAttachmentFile,
} from "@/lib/platform/notification-attachments";

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError(appErrorFromUnknown("File is required.", 400));
    }

    const { filename, mimeType } = validateNotificationAttachmentFile(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await createNotificationAttachmentFile({
      buffer,
      filename,
      mimeType,
      userId: BigInt(user.id),
    });

    return NextResponse.json({ data: saved });
  } catch (error) {
    return jsonError(error);
  }
}
