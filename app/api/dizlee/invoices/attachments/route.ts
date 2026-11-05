/**
 * POST — Dizlee portal.
 * Upload a supporting attachment for OpCo invoice create (any format, max 20 MB).
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  createInvoiceAttachmentFile,
  validateInvoiceAttachmentFile,
} from "@/lib/dizlee/invoice-attachments";

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

    const { filename, mimeType } = validateInvoiceAttachmentFile(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const saved = await createInvoiceAttachmentFile({
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
