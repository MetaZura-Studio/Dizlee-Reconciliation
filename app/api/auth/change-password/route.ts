/**
 * POST — Auth portal.
 * Change the authenticated user's password after verifying the current one.
 */

import { NextResponse } from "next/server";

import {
  AUTH_RATE_LIMITS,
  assertRateLimit,
} from "@/lib/auth/rate-limit";
import { changePasswordForUser } from "@/lib/auth/password-flow";
import { getAnyAppSessionUser } from "@/lib/auth/session";
import { jsonError, unauthorized } from "@/lib/errors/respond";

export async function POST(request: Request) {
  const sessionUser = await getAnyAppSessionUser();
  if (!sessionUser) {
    return unauthorized();
  }

  try {
    assertRateLimit({
      key: `change-password:user:${sessionUser.id}`,
      limit: AUTH_RATE_LIMITS.changePasswordUser.limit,
      windowMs: AUTH_RATE_LIMITS.changePasswordUser.windowMs,
    });

    const body = await request.json();
    await changePasswordForUser(sessionUser, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
