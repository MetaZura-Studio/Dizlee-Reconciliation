"use client";

import { signOut } from "next-auth/react";

type SignOutButtonProps = {
  callbackUrl?: string;
  className?: string;
  label?: string;
};

export function SignOutButton({
  callbackUrl = "/login",
  className = "text-sm text-foreground-muted underline hover:text-foreground",
  label = "Sign out",
}: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl })}
      className={className}
    >
      {label}
    </button>
  );
}
