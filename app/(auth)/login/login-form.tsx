"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { getMainPortalHomePath } from "@/lib/auth/roles";
import { isMainPortalRole } from "@/lib/auth/scopes";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "You do not have access to that portal.",
  MissingOpcoScope: "Your OpCo account is missing an OpCo assignment.",
  MissingPartnerScope: "Your Partner account is missing a partner assignment.",
  CredentialsSignin: "Invalid email or password.",
};

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const queryError = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl");
  const queryMessage = searchParams.get("message");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        scope: "main",
        redirect: false,
      });

      if (!result?.ok) {
        setError(ERROR_MESSAGES.CredentialsSignin);
        return;
      }

      const sessionResponse = await fetch("/api/auth/session");
      const session = (await sessionResponse.json()) as {
        user?: { role?: string };
      };

      const role = session.user?.role;
      if (!role || !isMainPortalRole(role)) {
        setError(ERROR_MESSAGES.CredentialsSignin);
        return;
      }

      const destination =
        callbackUrl && mainRoleMayAccessCallback(role, callbackUrl)
          ? callbackUrl
          : getMainPortalHomePath(role);

      router.push(destination);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const displayError =
    error ??
    (queryError ? (ERROR_MESSAGES[queryError] ?? "Sign in failed.") : null);

  const displaySuccess =
    queryMessage === "PasswordSet"
      ? "Password set. You can sign in with your new password."
      : queryMessage === "PasswordReset"
        ? "Password reset. You can sign in with your new password."
        : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {displaySuccess ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {displaySuccess}
        </p>
      ) : null}
      {displayError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {displayError}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-zinc-700 underline hover:text-zinc-900">
          Forgot password?
        </Link>
      </p>
    </form>
  );
}

function mainRoleMayAccessCallback(
  role: "opco" | "client" | "partner",
  callbackUrl: string,
): boolean {
  try {
    const path = new URL(callbackUrl, "http://localhost").pathname;
    if (role === "client") return path.startsWith("/dizlee");
    if (role === "opco") return path.startsWith("/opco");
    if (role === "partner") return path.startsWith("/partner");
    return false;
  } catch {
    return false;
  }
}
