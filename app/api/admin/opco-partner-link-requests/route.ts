/**
 * GET — Admin portal.
 * List OpCo partner-link requests (default: pending).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import {
  listAdminPartnerLinkRequests,
  type PartnerLinkRequestStatus,
} from "@/lib/admin/opco-partner-link-requests";
import { jsonError, unauthorized } from "@/lib/errors/respond";

export async function GET(request: NextRequest) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const statusRaw = request.nextUrl.searchParams.get("status");
    const normalized =
      statusRaw === null ? "PENDING" : statusRaw.trim().toUpperCase();
    const status =
      normalized === "ALL"
        ? "all"
        : normalized === "PENDING" ||
            normalized === "APPROVED" ||
            normalized === "REJECTED"
          ? (normalized as PartnerLinkRequestStatus)
          : "PENDING";

    const data = await listAdminPartnerLinkRequests({ status });
    return NextResponse.json({ data });
  } catch (error) {
    return jsonError(error);
  }
}
