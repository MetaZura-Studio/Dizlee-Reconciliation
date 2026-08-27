/**
 * Merge OpCo multi-partner report uploads into one Dizlee notification per OpCo+period.
 */

import { formatPeriodLabel } from "@/lib/opco/period";
import {
  OPCO_REPORTS_UPLOADED_SUBJECT,
  buildOpcoReportUploadBody,
  mergeOpcoReportUploadPartners,
  opcoReportUploadGroupKey,
  parseNotificationMetadata,
  serializeNotificationMetadata,
  type OpcoReportUploadMetadata,
} from "@/lib/platform/notification-metadata";
import { notifyDizleeUsers } from "@/lib/platform/notify-dizlee";
import { prisma } from "@/lib/prisma";

export async function notifyDizleeOpcoReportUpload(params: {
  fromUserId: bigint;
  opcoId: bigint;
  opcoName: string;
  partnerId: bigint;
  partnerName: string;
  month: number;
  year: number;
}): Promise<void> {
  const groupKey = opcoReportUploadGroupKey({
    opcoId: params.opcoId,
    year: params.year,
    month: params.month,
  });
  const periodLabel = formatPeriodLabel(params.year, params.month);
  const partner = {
    id: params.partnerId.toString(),
    name: params.partnerName,
  };

  const candidates = await prisma.notification.findMany({
    where: {
      isDeleted: false,
      subject: OPCO_REPORTS_UPLOADED_SUBJECT,
      metadataJson: { contains: groupKey },
    },
    orderBy: { sentAt: "desc" },
    take: 10,
    select: {
      id: true,
      metadataJson: true,
    },
  });

  const existing = candidates.find((row) => {
    const meta = parseNotificationMetadata(row.metadataJson);
    return (
      meta?.type === "OPCO_REPORT_UPLOAD" &&
      meta.groupKey === groupKey &&
      meta.opcoId === params.opcoId.toString() &&
      meta.month === params.month &&
      meta.year === params.year
    );
  });

  if (!existing) {
    const metadata: OpcoReportUploadMetadata = {
      type: "OPCO_REPORT_UPLOAD",
      groupKey,
      opcoId: params.opcoId.toString(),
      opcoName: params.opcoName,
      month: params.month,
      year: params.year,
      partners: [partner],
    };

    await notifyDizleeUsers({
      fromUserId: params.fromUserId,
      subject: OPCO_REPORTS_UPLOADED_SUBJECT,
      body: buildOpcoReportUploadBody({
        opcoName: params.opcoName,
        periodLabel,
        partners: metadata.partners,
      }),
      metadata,
    });
    return;
  }

  const parsed = parseNotificationMetadata(existing.metadataJson);
  const current = parsed?.type === "OPCO_REPORT_UPLOAD" ? parsed : null;

  const partners = mergeOpcoReportUploadPartners(
    current?.partners ?? [],
    partner,
  );

  const metadata: OpcoReportUploadMetadata = {
    type: "OPCO_REPORT_UPLOAD",
    groupKey,
    opcoId: params.opcoId.toString(),
    opcoName: params.opcoName,
    month: params.month,
    year: params.year,
    partners,
  };

  const sentAt = new Date();
  await prisma.$transaction([
    prisma.notification.update({
      where: { id: existing.id },
      data: {
        subject: OPCO_REPORTS_UPLOADED_SUBJECT,
        body: buildOpcoReportUploadBody({
          opcoName: params.opcoName,
          periodLabel,
          partners,
        }),
        metadataJson: serializeNotificationMetadata(metadata),
        sentAt,
        updatedByUserId: params.fromUserId,
      },
    }),
    prisma.notificationRead.deleteMany({
      where: { notificationId: existing.id },
    }),
  ]);
}
