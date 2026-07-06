import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { NotificationError } from "@/lib/dizlee/notifications/intimations";
import {
  getPartnerNotificationFormOptions,
  listPartnerNotifications,
  parsePartnerNotificationListFilters,
  sendNotificationToPartners,
} from "@/lib/dizlee/notifications/partners";

export async function GET(request: NextRequest) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = parsePartnerNotificationListFilters(searchParams);
    const [data, formOptions] = await Promise.all([
      listPartnerNotifications(filters),
      getPartnerNotificationFormOptions(),
    ]);

    return NextResponse.json({ data, formOptions });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load partner notifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      subject?: string;
      message?: string;
      body?: string;
      partnerIds?: string[];
      priority?: string | null;
      expiresAt?: string | null;
    };

    const result = await sendNotificationToPartners({
      input: {
        subject: body.subject ?? "",
        body: body.body ?? body.message ?? "",
        partnerIds: body.partnerIds ?? [],
        priority: body.priority,
        expiresAt: body.expiresAt,
      },
      fromUserId: user.id,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof NotificationError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Failed to send notification";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
