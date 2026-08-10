/**
 * GET — Partner portal.
 * Download a notification attachment for the partner inbox.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { getPartnerSession } from "@/lib/partner/auth";
import { buildNotificationAttachmentDownloadResponse } from "@/lib/platform/notification-attachment-download";

type RouteContext = {
  params: Promise<{ id: string; attachmentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getPartnerSession();

  if (!session) {
    return unauthorized();
  }

  const { id, attachmentId } = await context.params;

  if (!/^\d+$/.test(id) || !/^\d+$/.test(attachmentId)) {
    return jsonError(appErrorFromUnknown("Invalid id", 400));
  }

  return buildNotificationAttachmentDownloadResponse({
    notificationId: BigInt(id),
    attachmentId: BigInt(attachmentId),
    recipientMatch: {
      userId: BigInt(session.userId),
      orgId: BigInt(session.partnerId),
      orgType: "PARTNER",
    },
  });
}
