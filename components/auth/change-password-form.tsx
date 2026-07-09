"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PASSWORD_MIN_LENGTH, validatePasswordMatch } from "@/lib/auth/password-policy";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const mismatch = validatePasswordMatch(password, confirmPassword);
    if (mismatch) {
      setError(mismatch);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to change password");
      }

      setSuccess("Password updated.");
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to change password",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      {error ? (
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-success-border bg-success-muted px-3 py-2 text-sm text-success">
          {success}
        </p>
      ) : null}

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground-muted">Current password</span>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground-muted">New password</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-foreground-subtle">
          At least {PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, and a
          number.
        </span>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-foreground-muted">
          Confirm new password
        </span>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
