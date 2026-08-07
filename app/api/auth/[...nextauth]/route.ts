/**
 * GET, POST — Auth portal.
 * NextAuth.js session and sign-in/sign-out handlers.
 */

import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth/options";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
