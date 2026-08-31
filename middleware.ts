import { getToken, type JWT } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  isPublicApiPath,
  roleMayAccessApiPath,
} from "@/lib/auth/api-access";
import {
  getSessionTokenCookieName,
  type AuthCookieNamespace,
} from "@/lib/auth/cookies";
import { getLoginPathForPathname, roleMayAccessPath } from "@/lib/auth/roles";
import { isAppRole, type AppRole } from "@/lib/auth/types";
import { ERROR_CATALOG } from "@/lib/errors/catalog";
import {
  buildContentSecurityPolicy,
  createCspNonce,
} from "@/lib/platform/csp";

const MAIN_PORTAL_PREFIXES = ["/partner", "/opco", "/dizlee"];

type ActiveToken = JWT & { role: AppRole };

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

/** Attach CSP (+ forward nonce for App Router) to a continue response. */
function nextWithCsp(request: NextRequest): NextResponse {
  const nonce = createCspNonce();
  const csp = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js reads the nonce from the CSP request header during SSR.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

/** Attach CSP to redirects / JSON errors (no App Router render). */
function respondWithCsp(response: NextResponse): NextResponse {
  const nonce = createCspNonce();
  response.headers.set(
    "Content-Security-Policy",
    buildContentSecurityPolicy(nonce),
  );
  return response;
}

async function readToken(
  request: NextRequest,
  namespace: AuthCookieNamespace,
): Promise<JWT | null> {
  return getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: getSessionTokenCookieName(namespace),
  });
}

function cookieNamespaceForApiPath(pathname: string): AuthCookieNamespace {
  if (pathname.startsWith("/api/admin")) {
    return "admin";
  }
  return "main";
}

function isActiveToken(token: JWT | null): token is ActiveToken {
  return Boolean(
    token &&
      typeof token.role === "string" &&
      isAppRole(token.role) &&
      token.error !== "InactiveUser",
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // --- API gate (JSON 401/403; no redirects) ---
  if (pathname.startsWith("/api/")) {
    if (isPublicApiPath(pathname)) {
      return nextWithCsp(request);
    }

    let token = await readToken(
      request,
      cookieNamespaceForApiPath(pathname),
    );

    // Shared change-password may be called from either portal session.
    if (
      pathname === "/api/auth/change-password" &&
      !isActiveToken(token)
    ) {
      token = await readToken(request, "admin");
    }

    if (!isActiveToken(token)) {
      return respondWithCsp(
        apiErrorResponse(
          token?.error === "InactiveUser"
            ? "ACCOUNT_NOT_ACTIVE"
            : "UNAUTHORIZED",
        ),
      );
    }

    if (!roleMayAccessApiPath(token.role, pathname)) {
      return respondWithCsp(apiErrorResponse("UNAUTHORIZED"));
    }

    if (token.role === "opco" && !token.opcoId) {
      return respondWithCsp(apiErrorResponse("UNAUTHORIZED"));
    }

    if (token.role === "partner" && !token.partnerId) {
      return respondWithCsp(apiErrorResponse("UNAUTHORIZED"));
    }

    return nextWithCsp(request);
  }

  // --- Page gate (redirect to login) ---
  if (pathname === "/admin/login") {
    return nextWithCsp(request);
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isMainPortalRoute = MAIN_PORTAL_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!isAdminRoute && !isMainPortalRoute) {
    return nextWithCsp(request);
  }

  const token = await readToken(request, isAdminRoute ? "admin" : "main");

  const loginPath = getLoginPathForPathname(pathname);
  const loginUrl = new URL(loginPath, request.url);

  if (!isActiveToken(token)) {
    loginUrl.searchParams.set("callbackUrl", pathname);
    return respondWithCsp(NextResponse.redirect(loginUrl));
  }

  if (!roleMayAccessPath(token.role, pathname)) {
    loginUrl.searchParams.set("error", "AccessDenied");
    return respondWithCsp(NextResponse.redirect(loginUrl));
  }

  if (token.role === "opco" && !token.opcoId) {
    loginUrl.searchParams.set("error", "MissingOpcoScope");
    return respondWithCsp(NextResponse.redirect(loginUrl));
  }

  if (token.role === "partner" && !token.partnerId) {
    loginUrl.searchParams.set("error", "MissingPartnerScope");
    return respondWithCsp(NextResponse.redirect(loginUrl));
  }

  return nextWithCsp(request);
}

export const config = {
  matcher: [
    /*
     * Auth gate + CSP nonce for app routes and APIs.
     * Skip Next internals and common static assets.
     */
    "/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml)$).*)",
  ],
};
