"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-zinc-600 underline hover:text-zinc-900"
    >
      Sign out
    </button>
  );
}
