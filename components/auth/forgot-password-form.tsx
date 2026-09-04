"use client";

import Link from "next/link";
import { useState } from "react";

import { FieldLabel } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to send reset link"));
      }
      setMessage(body.message as string);
      toast.success(body.message as string);
      setSubmitted(true);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to send reset link",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setMessage(null);
    setError(null);
  };

  if (submitted && message) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-surface-muted/50 px-4 py-4">
          <p className="text-sm font-medium">Check your email</p>
          <p className="mt-2 text-sm">{message}</p>
        </div>

        <p className="text-center text-sm text-foreground-muted">
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            onClick={resetForm}
            className="font-medium text-foreground underline hover:text-foreground-muted"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <div className="space-y-1">
        <FieldLabel htmlFor="email" required>
          Email address
        </FieldLabel>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          placeholder="you@company.com"
          className={ui.input}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full ${ui.btnPrimary}`}
      >
        {submitting ? "Sending reset link…" : "Send reset link"}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-foreground-muted underline hover:text-foreground">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
