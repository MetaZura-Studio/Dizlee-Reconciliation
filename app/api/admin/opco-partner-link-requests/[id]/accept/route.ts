/**
 * POST — Admin portal.
 * Accept an OpCo partner-link request (link matching partners).
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { acceptPartnerLinkRequest } from "@/lib/admin/opco-partner-link-requests";
import { jsonError, unauthorized } from "@/lib/errors/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const result = await acceptPartnerLinkRequest({
      requestId: id,
      actorUserId: BigInt(user.id),
    });
    return NextResponse.json({
      data: result.request,
      linkedPartnerNames: result.linkedPartnerNames,
      missingPartnerNames: result.missingPartnerNames,
      approved: result.approved,
      message: result.message,
    });
  } catch (error) {
    return jsonError(error);
  }
}
