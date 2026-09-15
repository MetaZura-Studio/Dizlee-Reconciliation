/**
 * GET, POST — Dizlee portal.
 * List or send submission reminder emails to OpCos and partners.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  jsonError,
  unauthorized,
  validationFailed,
} from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { DEFAULT_REMINDER_MESSAGE_SOURCE } from "@/lib/dizlee/notifications/broadcast.shared";
import {
  getReminderSettings,
  listReminderLanes,
  parseReminderFilters,
  sendReportReminders,
} from "@/lib/dizlee/notifications/reminders";
import { getReportFilterOptions } from "@/lib/dizlee/reports-monitoring";
import { sendRemindersBodySchema } from "@/lib/dizlee/validation/api-bodies";
import {
  ndjsonProgressResponse,
  wantsNdjsonProgress,
} from "@/lib/http/ndjson-progress";
import { parseDeliveryChannel } from "@/lib/platform/notification-delivery.shared";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parseReminderFilters(searchParams);
    const [data, settings, filterOptions] = await Promise.all([
      listReminderLanes(filters),
      getReminderSettings(),
      getReportFilterOptions(),
    ]);

    return NextResponse.json({ data, settings, filterOptions });
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

    const parsed = sendRemindersBodySchema.safeParse(raw);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten().fieldErrors);
    }

    const body = parsed.data;
    const input = {
      month: body.month,
      year: body.year,
      laneKeys: body.laneKeys ?? [],
      target: body.target ?? "both",
      messageSource: body.messageSource ?? DEFAULT_REMINDER_MESSAGE_SOURCE,
      subject: body.subject,
      body: body.body,
      attachmentFileIds: body.attachmentFileIds,
      deliveryChannel: parseDeliveryChannel(body.deliveryChannel),
    };

    if (wantsNdjsonProgress(request)) {
      return ndjsonProgressResponse(async (emitProgress) => {
        return sendReportReminders({
          input,
          fromUserId: user.id,
          onEmailProgress: emitProgress,
        });
      });
    }

    const result = await sendReportReminders({
      input,
      fromUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
