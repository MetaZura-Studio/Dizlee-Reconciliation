/**
 * POST — Auth portal.
 * Request a password reset email for a registered email address.
 */

import { NextResponse } from "next/server";

import {
  AUTH_RATE_LIMITS,
  assertRateLimit,
  getClientIp,
  normalizeRateLimitEmail,
} from "@/lib/auth/rate-limit";
import { requestForgotPassword } from "@/lib/auth/password-flow";
import { jsonError } from "@/lib/errors/respond";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    assertRateLimit({
      key: `forgot:ip:${ip}`,
      limit: AUTH_RATE_LIMITS.forgotPasswordIp.limit,
      windowMs: AUTH_RATE_LIMITS.forgotPasswordIp.windowMs,
    });

    const body = await request.json();
    if (
      body &&
      typeof body === "object" &&
      "email" in body &&
      typeof (body as { email: unknown }).email === "string" &&
      (body as { email: string }).email.trim()
    ) {
      assertRateLimit({
        key: `forgot:email:${normalizeRateLimitEmail((body as { email: string }).email)}`,
        limit: AUTH_RATE_LIMITS.forgotPasswordEmail.limit,
        windowMs: AUTH_RATE_LIMITS.forgotPasswordEmail.windowMs,
      });
    }

    const result = await requestForgotPassword(body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
