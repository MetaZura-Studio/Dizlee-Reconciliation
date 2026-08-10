/**
 * GET, POST — Dizlee portal.
 * List or send submission reminder emails to OpCos and partners.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";
import { appErrorFromUnknown } from "@/lib/errors/app-error";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  DEFAULT_REMINDER_MESSAGE_SOURCE,
  type SendReportRemindersInput,
} from "@/lib/dizlee/notifications/broadcast.shared";
import {
  getReminderSettings,
  listReminderLanes,
  parseReminderFilters,
  sendReportReminders,
} from "@/lib/dizlee/notifications/reminders";
import { getReportFilterOptions } from "@/lib/dizlee/reports-monitoring";

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
    const body = (await request.json()) as {
      month?: number;
      year?: number;
      laneKeys?: string[];
      target?: "opco" | "partner" | "both";
      messageSource?: SendReportRemindersInput["messageSource"];
      subject?: string;
      body?: string;
      attachmentFileIds?: string[];
    };

    if (!body.month || !body.year) {
      return jsonError(appErrorFromUnknown("Period is required.", 400));
    }

    const target = body.target ?? "both";
    if (target !== "opco" && target !== "partner" && target !== "both") {
      return jsonError(appErrorFromUnknown("Invalid reminder target.", 400));
    }

    const result = await sendReportReminders({
      input: {
        month: body.month,
        year: body.year,
        laneKeys: body.laneKeys ?? [],
        target,
        messageSource: body.messageSource ?? DEFAULT_REMINDER_MESSAGE_SOURCE,
        subject: body.subject,
        body: body.body,
        attachmentFileIds: body.attachmentFileIds,
      },
      fromUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    return jsonError(error);
  }
}
