import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getLoginPathForPathname, roleMayAccessPath } from "@/lib/auth/roles";
import { isAppRole } from "@/lib/auth/types";

const MAIN_PORTAL_PREFIXES = ["/partner", "/opco", "/dizlee"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isMainPortalRoute = MAIN_PORTAL_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isAdminRoute && !isMainPortalRoute) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const loginPath = getLoginPathForPathname(pathname);
  const loginUrl = new URL(loginPath, request.url);

  if (!token?.role || !isAppRole(token.role)) {
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!roleMayAccessPath(token.role, pathname)) {
    loginUrl.searchParams.set("error", "AccessDenied");
    return NextResponse.redirect(loginUrl);
  }

  if (token.role === "opco" && !token.opcoId) {
    loginUrl.searchParams.set("error", "MissingOpcoScope");
    return NextResponse.redirect(loginUrl);
  }

  if (token.role === "partner" && !token.partnerId) {
    loginUrl.searchParams.set("error", "MissingPartnerScope");
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/partner/:path*", "/opco/:path*", "/dizlee/:path*"],
};
