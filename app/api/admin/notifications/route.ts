/**
 * GET — Admin portal.
 * List notifications for the signed-in Admin user.
 */

import { NextResponse } from "next/server";
import { unauthorized } from "@/lib/errors/respond";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  listAdminInboxNotifications,
  parseAdminInboxFilters,
} from "@/lib/admin/notifications";

export async function GET(request: Request) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  const filters = parseAdminInboxFilters(new URL(request.url).searchParams);
  const result = await listAdminInboxNotifications({
    userId: BigInt(user.id),
    filters,
  });

  return NextResponse.json({ result });
}
