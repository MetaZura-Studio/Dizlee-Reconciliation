/**
 * PATCH — Dizlee portal.
 * Reject a partner or OpCo file re-upload request.
 */

import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import { rejectReuploadRequest } from "@/lib/dizlee/reupload-requests";
import { rejectReuploadBodySchema } from "@/lib/dizlee/validation/api-bodies";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  let decisionNote: string | undefined;
  try {
    const raw = await request.json();
    const parsed = rejectReuploadBodySchema.safeParse(raw);
    // Empty / odd bodies still allow reject; only use note when shape is OK.
    if (parsed.success) {
      decisionNote = parsed.data.decisionNote;
    }
  } catch {
    decisionNote = undefined;
  }

  try {
    await rejectReuploadRequest(id, user.id, decisionNote);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
