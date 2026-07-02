import type { AppRole } from "@/lib/auth/types";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: AppRole;
      opcoId: string | null;
      partnerId: string | null;
    };
  }

  interface User {
    id: string;
    role: AppRole;
    opcoId: string | null;
    partnerId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: AppRole;
    opcoId?: string | null;
    partnerId?: string | null;
  }
}
