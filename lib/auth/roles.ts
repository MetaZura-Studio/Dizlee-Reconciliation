import type { AppRole } from "@/lib/auth/types";

const PORTAL_HOME: Record<AppRole, string> = {
  admin: "/admin",
  client: "/dizlee",
  opco: "/opco",
  partner: "/partner",
};

export function getPortalHomePath(role: AppRole): string {
  return PORTAL_HOME[role];
}

export function roleMayAccessPath(role: AppRole, pathname: string): boolean {
  if (role === "admin") return pathname.startsWith("/admin");
  if (role === "client") return pathname.startsWith("/dizlee");
  if (role === "opco") return pathname.startsWith("/opco");
  if (role === "partner") return pathname.startsWith("/partner");
  return false;
}
