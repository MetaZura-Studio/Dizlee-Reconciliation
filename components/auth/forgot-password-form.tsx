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
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-4">
          <p className="text-sm font-medium text-emerald-900">Check your email</p>
          <p className="mt-2 text-sm text-emerald-800">{message}</p>
          <p className="mt-3 text-sm text-emerald-800">
            We sent a reset link to{" "}
            <span className="font-medium">{email}</span>. The link expires in 24
            hours and can only be used once.
          </p>
        </div>

        <p className="text-center text-sm text-zinc-600">
          Didn&apos;t receive it?{" "}
          <button
            type="button"
            onClick={resetForm}
            className="font-medium text-zinc-900 underline hover:text-zinc-700"
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
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
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
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {submitting ? "Sending reset link…" : "Send reset link"}
      </button>

      <p className="text-center text-sm">
        <Link href="/login" className="text-zinc-700 underline hover:text-zinc-900">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
