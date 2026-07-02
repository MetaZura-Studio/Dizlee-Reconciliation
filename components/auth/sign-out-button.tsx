"use client";

import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  callbackUrl?: string;
};

export function SignOutButton({ callbackUrl = "/login" }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className="text-sm text-zinc-600 underline hover:text-zinc-900"
    >
      Sign out
    </button>
  );
}
