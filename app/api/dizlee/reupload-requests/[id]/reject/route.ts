import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  ReuploadRequestError,
  rejectReuploadRequest,
} from "@/lib/dizlee/reupload-requests";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  let decisionNote: string | undefined;
  try {
    const body = (await request.json()) as { decisionNote?: string };
    decisionNote = body.decisionNote;
  } catch {
    decisionNote = undefined;
  }

  try {
    await rejectReuploadRequest(id, user.id, decisionNote);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ReuploadRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Failed to reject reupload request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
