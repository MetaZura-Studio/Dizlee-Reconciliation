/**
 * POST — Dizlee portal.
 * Send OpCo/Partner mismatch alert for a reconciliation and record alertedAt.
 */

import { NextResponse } from "next/server";
import {
  jsonError,
  unauthorized,
  validationFailed,
} from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { sendBroadcastNotification } from "@/lib/dizlee/notifications/intimations";
import {
  getReconciliationDetail,
  markReconciliationAlerted,
  ReconciliationError,
} from "@/lib/dizlee/reconciliation";
import { reconciliationAlertBodySchema } from "@/lib/dizlee/validation/api-bodies";
import { parseDeliveryChannel } from "@/lib/platform/notification-delivery.shared";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id: idRaw } = await context.params;
    if (!/^\d+$/.test(idRaw)) {
      throw new ReconciliationError("Invalid reconciliation id", 400);
    }
    const reconciliationId = Number(idRaw);

    const detail = await getReconciliationDetail(reconciliationId);
    if (!detail) {
      throw new ReconciliationError("Reconciliation not found.", 404);
    }
    if (!detail.canAlert) {
      throw new ReconciliationError(
        "Alerts are only available when there are mismatches.",
        400,
      );
    }

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return validationFailed();
    }

    const parsed = reconciliationAlertBodySchema.safeParse(raw);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten().fieldErrors);
    }

    const body = parsed.data;
    const deliveryChannel = parseDeliveryChannel(body.deliveryChannel);
    const audience = body.audience;
    const messages: string[] = [];

    async function sendSide(
      side: "opco" | "partner",
      subject: string,
      messageBody: string,
    ) {
      const result = await sendBroadcastNotification({
        input: {
          audience: side,
          opcoIds: side === "opco" ? [detail!.opcoId] : [],
          partnerIds: side === "partner" ? [detail!.partnerId] : [],
          messageSource: "custom",
          month: detail!.period.month,
          year: detail!.period.year,
          subject,
          body: messageBody,
          priority: detail!.unmatchedCount > 0 ? "HIGH" : "NORMAL",
          attachmentFileIds: body.attachmentFileIds,
          deliveryChannel,
        },
        fromUserId: user!.id,
      });
      messages.push(result.message);
    }

    if (audience === "opco" || audience === "both") {
      await sendSide("opco", body.opcoSubject, body.opcoBody);
    }
    if (audience === "partner" || audience === "both") {
      await sendSide("partner", body.partnerSubject, body.partnerBody);
    }

    const updated = await markReconciliationAlerted(
      reconciliationId,
      user.id,
    );

    const summary =
      audience === "both"
        ? "Alerts sent to OpCo and Partner."
        : audience === "opco"
          ? (messages[0] ?? "Alert sent to OpCo.")
          : (messages[0] ?? "Alert sent to Partner.");

    return NextResponse.json({
      data: {
        message: summary,
        detail: updated,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
