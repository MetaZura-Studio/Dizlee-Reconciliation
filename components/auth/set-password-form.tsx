"use client";

import { useState } from "react";

import { FieldLabel } from "@/components/ui/field";
import { PASSWORD_MIN_LENGTH, validatePasswordMatch } from "@/lib/auth/password-policy";
import { ui } from "@/lib/ui/classes";

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
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <div className="space-y-1">
        <FieldLabel htmlFor="password" required>
          New password
        </FieldLabel>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          className={ui.input}
        />
        <p className={ui.hint}>
          At least {PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, and a
          number.
        </p>
      </div>

      <div className="space-y-1">
        <FieldLabel htmlFor="confirmPassword" required>
          Confirm new password
        </FieldLabel>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
          className={ui.input}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full ${ui.btnPrimary}`}
      >
        {submitting ? savingLabel : submitLabel}
      </button>
    </form>
  );
}
