import { NextResponse } from "next/server";

import { requireDizleeSession } from "@/lib/dizlee/auth";
import {
  ReuploadRequestError,
  approveReuploadRequest,
} from "@/lib/dizlee/reupload-requests";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_request: Request, context: RouteContext) {
  const user = await requireDizleeSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await approveReuploadRequest(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ReuploadRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    const message =
      error instanceof Error ? error.message : "Failed to approve reupload request";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
