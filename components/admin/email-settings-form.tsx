"use client";

import { useCallback, useState } from "react";

import type { EmailSettingsView } from "@/lib/admin/email-settings";

type EmailSettingsFormProps = {
  initialSettings: EmailSettingsView;
};

function formatValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Not set";
  }
  return String(value);
}

export function EmailSettingsForm({ initialSettings }: EmailSettingsFormProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [testRecipient, setTestRecipient] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const reloadSettings = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setReloading(true);

    try {
      const response = await fetch("/api/admin/email-settings");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to reload email settings");
      }
      setSettings(body.data as EmailSettingsView);
    } catch (reloadError) {
      setError(
        reloadError instanceof Error
          ? reloadError.message
          : "Failed to reload email settings",
      );
    } finally {
      setReloading(false);
    }
  }, []);

  const sendTest = async () => {
    setError(null);
    setSuccess(null);

    if (!testRecipient.trim()) {
      setError("Enter the email address to receive the test.");
      return;
    }

    setSendingTest(true);
    try {
      const response = await fetch("/api/admin/email-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: testRecipient.trim() }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to send test email");
      }
      setSuccess(body.message as string);
    } catch (testError) {
      setError(
        testError instanceof Error
          ? testError.message
          : "Failed to send test email",
      );
    } finally {
      setSendingTest(false);
    }
  };

  const testDisabled =
    !settings.emailEnabled || sendingTest || testRecipient.trim().length === 0;

  return (
    <div className="space-y-8">
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

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">SMTP from .env</h2>
          <p className="text-sm text-foreground-muted">
            Outbound email is configured in the server <code>.env</code> file.
            Update values there and restart the dev server. Admin email settings
            in the database are not used for sending.
          </p>
        </div>

        <dl className="grid gap-3 rounded-lg border border-border bg-surface-muted p-4 text-sm">
          <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium text-foreground-muted">EMAIL_ENABLED</dt>
            <dd>{settings.emailEnabled ? "true" : "false"}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium text-foreground-muted">SMTP_HOST</dt>
            <dd>{formatValue(settings.smtpHost)}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium text-foreground-muted">SMTP_PORT</dt>
            <dd>{formatValue(settings.smtpPort)}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium text-foreground-muted">SMTP_FROM</dt>
            <dd>{formatValue(settings.senderAddress)}</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium text-foreground-muted">SMTP_USER</dt>
            <dd>Set in .env (not shown)</dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium text-foreground-muted">SMTP_PASSWORD</dt>
            <dd>Set in .env (not shown)</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={() => void reloadSettings()}
          disabled={reloading}
          className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted disabled:opacity-60"
        >
          {reloading ? "Reloading…" : "Reload from .env"}
        </button>
      </section>

      <section className="space-y-4 border-t border-border pt-6">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">Send test email</h2>
          <p className="text-sm text-foreground-muted">
            Verify delivery using the current .env SMTP configuration.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="testRecipient" className="text-sm font-medium text-foreground-muted">
            Send test email to
          </label>
          <input
            id="testRecipient"
            type="email"
            value={testRecipient}
            onChange={(event) => setTestRecipient(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <button
          type="button"
          onClick={() => void sendTest()}
          disabled={testDisabled}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
        >
          {sendingTest ? "Sending…" : "Send test email"}
        </button>
      </section>
    </div>
  );
}
