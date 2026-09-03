/**
 * GET, POST — Auth portal.
 * NextAuth.js session and sign-in/sign-out handlers.
 * Credentials sign-in is rate-limited by client IP.
 */

import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth/options";
import {
  AUTH_RATE_LIMITS,
  consumeRateLimit,
  getClientIp,
} from "@/lib/auth/rate-limit";
import { ERROR_CATALOG } from "@/lib/errors/catalog";

const nextAuthHandler = NextAuth(authOptions);

type RouteContext = {
  params: Promise<{ nextauth: string[] }> | { nextauth: string[] };
};

async function resolveNextAuthSegments(
  context: RouteContext,
): Promise<string[]> {
  const params = await Promise.resolve(context.params);
  return params.nextauth ?? [];
}

function isCredentialsSignIn(segments: string[]): boolean {
  return (
    (segments[0] === "callback" && segments[1] === "credentials") ||
    (segments[0] === "signin" && segments[1] === "credentials")
  );
}

export async function GET(request: Request, context: RouteContext) {
  return nextAuthHandler(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  const segments = await resolveNextAuthSegments(context);

  if (isCredentialsSignIn(segments)) {
    const ip = getClientIp(request);
    const limited = await consumeRateLimit({
      key: `login:ip:${ip}`,
      limit: AUTH_RATE_LIMITS.loginIp.limit,
      windowMs: AUTH_RATE_LIMITS.loginIp.windowMs,
    });
    if (!limited.allowed) {
      const def = ERROR_CATALOG.RATE_LIMITED;
      return NextResponse.json(
        {
          error: {
            code: def.code,
            key: "RATE_LIMITED",
            message: def.message,
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limited.retryAfterSeconds),
          },
        },
      );
    }
  }

  return nextAuthHandler(request, context);
}
