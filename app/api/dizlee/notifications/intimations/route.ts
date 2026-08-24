/**
 * GET, POST — Dizlee portal.
 * List or send submission intimation emails to OpCos and partners.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  jsonError,
  unauthorized,
  validationFailed,
} from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  getIntimationFormOptions,
  listIntimations,
  parseIntimationListFilters,
  sendBroadcastNotification,
} from "@/lib/dizlee/notifications/intimations";
import { sendBroadcastBodySchema } from "@/lib/dizlee/validation/api-bodies";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseIntimationListFilters(searchParams);
    const [data, formOptions] = await Promise.all([
      listIntimations(filters),
      getIntimationFormOptions(),
    ]);

    return NextResponse.json({ data, formOptions });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return validationFailed();
    }

    const parsed = sendBroadcastBodySchema.safeParse(raw);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten().fieldErrors);
    }

    const body = parsed.data;
    const result = await sendBroadcastNotification({
      input: {
        audience: body.audience ?? "opco",
        opcoIds: body.opcoIds ?? [],
        partnerIds: body.partnerIds ?? [],
        messageSource: body.messageSource ?? "custom",
        month: body.month,
        year: body.year,
        subject: body.subject,
        body: body.body ?? body.message,
        priority: body.priority,
        expiresAt: body.expiresAt,
        attachmentFileIds: body.attachmentFileIds,
      },
      fromUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
