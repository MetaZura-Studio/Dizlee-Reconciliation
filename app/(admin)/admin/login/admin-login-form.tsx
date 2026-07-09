"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { ADMIN_DEFAULT_ROUTE } from "@/lib/admin/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "You do not have access to the Admin portal.",
  CredentialsSignin: "Invalid email or password.",
};

export function AdminLoginForm() {
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
        scope: "admin",
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

      if (session.user?.role !== "admin") {
        setError(ERROR_MESSAGES.CredentialsSignin);
        return;
      }

      const destination =
        callbackUrl && callbackUrl.startsWith("/admin") && callbackUrl !== "/admin/login"
          ? callbackUrl
          : ADMIN_DEFAULT_ROUTE;

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
        <p className="rounded-md border border-success-border bg-success-muted px-3 py-2 text-sm text-success">
          {displaySuccess}
        </p>
      ) : null}
      {displayError ? (
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {displayError}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-foreground-muted">
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
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-foreground-muted">
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
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {isSubmitting ? "Signing in..." : "Sign in to Admin"}
      </button>

      <p className="text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-foreground-muted underline hover:text-foreground"
        >
          Forgot password?
        </Link>
      </p>
    </form>
  );
}
