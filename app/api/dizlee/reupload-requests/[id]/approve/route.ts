/**
 * PATCH — Dizlee portal.
 * Approve a partner or OpCo file re-upload request.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { approveReuploadRequest } from "@/lib/dizlee/reupload-requests";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  try {
    await approveReuploadRequest(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
