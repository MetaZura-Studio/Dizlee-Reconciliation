"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { PasswordInput } from "@/components/auth/password-input";
import { FieldLabel } from "@/components/ui/field";
import { FullPageLoading } from "@/components/ui/loading";
import { startNavigationProgress } from "@/components/ui/navigation-progress";
import { useToast } from "@/components/ui/toast";
import { formatErrorDisplay } from "@/lib/errors/format";
import { ERROR_CATALOG } from "@/lib/errors/catalog";
import { getMainPortalHomePath } from "@/lib/auth/roles";
import { isMainPortalRole } from "@/lib/auth/scopes";
import { ui } from "@/lib/ui/classes";

const LOGIN_ERROR_KEYS: Record<string, keyof typeof ERROR_CATALOG> = {
  AccessDenied: "UNAUTHORIZED",
  MissingOpcoScope: "UNAUTHORIZED",
  MissingPartnerScope: "UNAUTHORIZED",
  CredentialsSignin: "INVALID_CREDENTIALS",
};

function formatLoginError(code: string | null | undefined): string {
  if (!code) {
    return formatErrorDisplay(
      ERROR_CATALOG.SYSTEM_ERROR.code,
      ERROR_CATALOG.SYSTEM_ERROR.message,
    );
  }
  const key = LOGIN_ERROR_KEYS[code] ?? "INVALID_CREDENTIALS";
  const def = ERROR_CATALOG[key];
  return formatErrorDisplay(def.code, def.message);
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

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
        setError(formatLoginError("CredentialsSignin"));
        setIsSubmitting(false);
        return;
      }

      const sessionResponse = await fetch("/api/auth/session");
      const session = (await sessionResponse.json()) as {
        user?: { role?: string };
      };

      const role = session.user?.role;
      if (!role || !isMainPortalRole(role)) {
        setError(formatLoginError("CredentialsSignin"));
        setIsSubmitting(false);
        return;
      }

      const destination =
        callbackUrl && mainRoleMayAccessCallback(role, callbackUrl)
          ? callbackUrl
          : getMainPortalHomePath(role);

      startNavigationProgress();
      router.push(destination);
      router.refresh();
      // Keep FullPageLoading until this page unmounts after navigation.
    } catch {
      setError(formatLoginError(null));
      setIsSubmitting(false);
    }
  }

  const displayError =
    error ?? (queryError ? formatLoginError(queryError) : null);

  const displaySuccess =
    queryMessage === "PasswordSet"
      ? "Password set. You can sign in with your new password."
      : queryMessage === "PasswordReset"
        ? "Password reset. You can sign in with your new password."
        : null;

  useEffect(() => {
    if (!displaySuccess) {
      return;
    }
    const timer = window.setTimeout(() => {
      toast.success(displaySuccess);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [displaySuccess, toast]);

  return (
    <>
      {isSubmitting ? (
        <FullPageLoading
          label="Signing in…"
          description="Verifying your credentials and opening your workspace."
        />
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {displayError ? <p className={ui.alertError}>{displayError}</p> : null}

        <div className="space-y-1">
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={ui.input}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-1">
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={ui.input}
            disabled={isSubmitting}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full ${ui.btnPrimary}`}
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
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
    </>
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
