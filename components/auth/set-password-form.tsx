"use client";

import { useState } from "react";

import { PASSWORD_MIN_LENGTH, validatePasswordMatch } from "@/lib/auth/password-policy";

type SetPasswordFormProps = {
  token: string;
  variant?: "invite" | "reset";
  onSuccess: () => void;
};

export function SetPasswordForm({
  token,
  variant = "invite",
  onSuccess,
}: SetPasswordFormProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const mismatch = validatePasswordMatch(password, confirmPassword);
    if (mismatch) {
      setError(mismatch);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to set password");
      }
      onSuccess();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to set password",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isReset = variant === "reset";
  const submitLabel = isReset ? "Reset password" : "Set password";
  const savingLabel = isReset ? "Resetting…" : "Saving…";

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
        <p className="text-xs text-zinc-500">
          At least {PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, and a
          number.
        </p>
      </div>

      <div className="space-y-1">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-zinc-700"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
      >
        {submitting ? savingLabel : submitLabel}
      </button>
    </form>
  );
}
