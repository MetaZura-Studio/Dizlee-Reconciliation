/**
 * Safe post-login redirect targets — relative same-origin paths only.
 * Prevents open redirects via absolute or protocol-relative callbackUrl values.
 */

export function parseSafeRelativeCallbackUrl(
  callbackUrl: string,
): string | null {
  const trimmed = callbackUrl.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }
  // Protocol-relative: //evil.com/...
  if (trimmed.startsWith("//")) {
    return null;
  }
  if (trimmed.includes("://") || trimmed.includes("\\")) {
    return null;
  }

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return null;
  }
  if (
    decoded.startsWith("//") ||
    decoded.includes("://") ||
    decoded.includes("\\")
  ) {
    return null;
  }

  try {
    const url = new URL(trimmed, "http://localhost");
    // Relative inputs must stay on the base origin.
    if (url.origin !== "http://localhost") {
      return null;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function safeMainPortalCallbackUrl(
  role: "opco" | "client" | "partner",
  callbackUrl: string | null | undefined,
): string | null {
  if (!callbackUrl) {
    return null;
  }
  const safe = parseSafeRelativeCallbackUrl(callbackUrl);
  if (!safe) {
    return null;
  }
  const path = new URL(safe, "http://localhost").pathname;
  if (role === "client" && path.startsWith("/dizlee")) {
    return safe;
  }
  if (role === "opco" && path.startsWith("/opco")) {
    return safe;
  }
  if (role === "partner" && path.startsWith("/partner")) {
    return safe;
  }
  return null;
}

export function safeAdminCallbackUrl(
  callbackUrl: string | null | undefined,
): string | null {
  if (!callbackUrl) {
    return null;
  }
  const safe = parseSafeRelativeCallbackUrl(callbackUrl);
  if (!safe) {
    return null;
  }
  const path = new URL(safe, "http://localhost").pathname;
  if (!path.startsWith("/admin")) {
    return null;
  }
  if (path === "/admin/login" || path.startsWith("/admin/login/")) {
    return null;
  }
  return safe;
}
