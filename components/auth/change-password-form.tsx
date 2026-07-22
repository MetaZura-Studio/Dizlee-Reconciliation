"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PASSWORD_MIN_LENGTH, validatePasswordMatch } from "@/lib/auth/password-policy";
import { FieldLegend } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { ui } from "@/lib/ui/classes";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

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
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, password, confirmPassword }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to change password");
      }

      toast.success("Password updated.");
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
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <label className="block text-sm">
        <FieldLegend required>Current password</FieldLegend>
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          autoComplete="current-password"
          required
          className={ui.input}
        />
      </label>

      <label className="block text-sm">
        <FieldLegend required>New password</FieldLegend>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
          className={ui.input}
        />
        <span className={`mt-1 block ${ui.hint}`}>
          At least {PASSWORD_MIN_LENGTH} characters with uppercase, lowercase, and a
          number.
        </span>
      </label>

      <label className="block text-sm">
        <FieldLegend required>Confirm new password</FieldLegend>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          required
          className={ui.input}
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className={`w-full ${ui.btnPrimary}`}
      >
        {submitting ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}
