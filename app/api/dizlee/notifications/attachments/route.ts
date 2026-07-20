import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  createNotificationAttachmentFile,
  NotificationAttachmentError,
  validateNotificationAttachmentFile,
} from "@/lib/platform/notification-attachments";

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
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
    if (error instanceof NotificationAttachmentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Failed to upload attachment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
