/**
 * POST — Admin portal.
 * Reject an OpCo partner-link request.
 */

import { NextResponse } from "next/server";

import { requireAdminApiSession } from "@/lib/admin/api-auth";
import { rejectPartnerLinkRequest } from "@/lib/admin/opco-partner-link-requests";
import { jsonError, unauthorized } from "@/lib/errors/respond";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const user = await requireAdminApiSession();
  if (!user) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    let decisionNote: string | undefined;
    try {
      const body = (await request.json()) as { decisionNote?: string };
      decisionNote = body.decisionNote;
    } catch {
      // optional body
    }

    const data = await rejectPartnerLinkRequest({
      requestId: id,
      actorUserId: BigInt(user.id),
      decisionNote,
    });
    return NextResponse.json({
      data,
      message: "Partner link request denied. OpCo has been notified.",
    });
  } catch (error) {
    return jsonError(error);
  }
}
