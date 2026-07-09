"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
        throw new Error(body.error ?? "Failed to send reset link");
      }
      setMessage(body.message as string);
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
        <div className="rounded-md border border-success-border bg-success-muted px-4 py-4">
          <p className="text-sm font-medium text-success">Check your email</p>
          <p className="mt-2 text-sm text-success">{message}</p>
          <p className="mt-3 text-sm text-success">
            We sent a reset link to{" "}
            <span className="font-medium">{email}</span>. The link expires in 24
            hours and can only be used once.
          </p>
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
      {error ? (
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-foreground-muted">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
          placeholder="you@company.com"
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
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
