"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-foreground-muted underline hover:text-foreground"
    >
      Sign out
    </button>
  );
}
