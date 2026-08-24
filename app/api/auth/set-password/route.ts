/**
 * POST — Auth portal.
 * Set a new password using a valid invite or reset token.
 */

import { NextResponse } from "next/server";

import {
  AUTH_RATE_LIMITS,
  assertRateLimit,
  getClientIp,
} from "@/lib/auth/rate-limit";
import { setPasswordWithToken } from "@/lib/auth/password-flow";
import { jsonError } from "@/lib/errors/respond";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    assertRateLimit({
      key: `set-password:ip:${ip}`,
      limit: AUTH_RATE_LIMITS.setPasswordIp.limit,
      windowMs: AUTH_RATE_LIMITS.setPasswordIp.windowMs,
    });

    const body = await request.json();
    await setPasswordWithToken(body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error);
  }
}
