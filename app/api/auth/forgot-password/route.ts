/**
 * POST — Auth portal.
 * Request a password reset email for a registered email address.
 */

import { NextResponse } from "next/server";
import { jsonError } from "@/lib/errors/respond";

import { requestForgotPassword } from "@/lib/auth/password-flow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await requestForgotPassword(body);
    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error);
  }
}
