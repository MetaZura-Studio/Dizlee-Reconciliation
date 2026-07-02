"use client";

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        {isSubmitting ? "Signing in..." : "Sign in to Admin"}
      </button>
    </form>
  );
}
