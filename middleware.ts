import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { roleMayAccessPath } from "@/lib/auth/roles";
import { isAppRole } from "@/lib/auth/types";

const PROTECTED_PREFIXES = ["/admin", "/partner", "/opco", "/dizlee"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token?.role || !isAppRole(token.role)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!roleMayAccessPath(token.role, pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "AccessDenied");
    return NextResponse.redirect(loginUrl);
  }

  if (token.role === "opco" && !token.opcoId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "MissingOpcoScope");
    return NextResponse.redirect(loginUrl);
  }

  if (token.role === "partner" && !token.partnerId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "MissingPartnerScope");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/partner/:path*", "/opco/:path*", "/dizlee/:path*"],
};
