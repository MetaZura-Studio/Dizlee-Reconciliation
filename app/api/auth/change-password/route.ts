/**
 * POST — Auth portal.
 * Change the authenticated user's password after verifying the current one.
 */

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { jsonError, unauthorized } from "@/lib/errors/respond";

import { authOptions } from "@/lib/auth/options";
import { changePasswordForUser } from "@/lib/auth/password-flow";
import type { AppSessionUser } from "@/lib/auth/types";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.role) {
    return unauthorized();
  }

  const sessionUser: AppSessionUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name,
    role: session.user.role,
    opcoId: session.user.opcoId ?? null,
    partnerId: session.user.partnerId ?? null,
  };

  try {
    const body = await request.json();
    await changePasswordForUser(sessionUser, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
