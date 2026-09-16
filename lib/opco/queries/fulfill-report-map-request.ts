/**
 * Mark pending OpCo report-map requests fulfilled and notify OpCo users.
 * Kept separate from readiness helpers to avoid Admin↔OpCo import cycles.
 */

import "server-only";

import { notifyOpcoUsers } from "@/lib/platform/notify-opco";
import {
  formatReportMapReadyBody,
  REPORT_MAP_READY_SUBJECT,
} from "@/lib/platform/report-map-request";
import { prisma } from "@/lib/prisma";

export async function fulfillPendingReportMapRequests(params: {
  opcoId: bigint;
  actorUserId: bigint;
  opcoName: string;
  mappingConfigured: boolean;
}): Promise<void> {
  if (!params.mappingConfigured) {
    return;
  }

  const pending = await prisma.opcoReportMapRequest.findMany({
    where: { opcoId: params.opcoId, status: "PENDING" },
    select: { id: true },
  });
  if (pending.length === 0) {
    return;
  }

  const now = new Date();
  await prisma.opcoReportMapRequest.updateMany({
    where: {
      id: { in: pending.map((row) => row.id) },
      status: "PENDING",
    },
    data: {
      status: "FULFILLED",
      fulfilledAt: now,
      fulfilledByUserId: params.actorUserId,
    },
  });

  try {
    await notifyOpcoUsers({
      opcoId: params.opcoId,
      fromUserId: params.actorUserId,
      subject: REPORT_MAP_READY_SUBJECT,
      body: formatReportMapReadyBody(params.opcoName),
      metadata: {
        type: "REPORT_MAP_READY",
        opcoId: params.opcoId.toString(),
        opcoName: params.opcoName,
      },
    });
  } catch (error) {
    console.error(
      "[report-map-request] Failed to notify OpCo after mapping ready:",
      error,
    );
  }
}
