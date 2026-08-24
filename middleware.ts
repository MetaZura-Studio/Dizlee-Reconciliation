import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isPublicApiPath,
  roleMayAccessApiPath,
} from "@/lib/auth/api-access";
import { getLoginPathForPathname, roleMayAccessPath } from "@/lib/auth/roles";
import { isAppRole } from "@/lib/auth/types";
import { ERROR_CATALOG } from "@/lib/errors/catalog";

const MAIN_PORTAL_PREFIXES = ["/partner", "/opco", "/dizlee"];

function apiErrorResponse(key: "UNAUTHORIZED" | "ACCOUNT_NOT_ACTIVE") {
  const def = ERROR_CATALOG[key];
  return NextResponse.json(
    {
      error: {
        code: def.code,
        key,
        message: def.message,
      },
    },
    { status: def.status },
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- API gate (JSON 401/403; no redirects) ---
  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next();
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (
      !token?.role ||
      !isAppRole(token.role) ||
      token.error === "InactiveUser"
    ) {
      return apiErrorResponse(
        token?.error === "InactiveUser" ? "ACCOUNT_NOT_ACTIVE" : "UNAUTHORIZED",
      );
    }

    if (!roleMayAccessApiPath(token.role, pathname)) {
      return apiErrorResponse("UNAUTHORIZED");
    }

    if (token.role === "opco" && !token.opcoId) {
      return apiErrorResponse("UNAUTHORIZED");
    }

    if (token.role === "partner" && !token.partnerId) {
      return apiErrorResponse("UNAUTHORIZED");
    }

    return NextResponse.next();
  }

  // --- Page gate (redirect to login) ---
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

  if (!token?.role || !isAppRole(token.role) || token.error === "InactiveUser") {
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
  matcher: [
    "/admin/:path*",
    "/partner/:path*",
    "/opco/:path*",
    "/dizlee/:path*",
    "/api/:path*",
  ],
};
