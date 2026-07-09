"use client";

import { useCallback, useState } from "react";

import type { EmailSettingsView } from "@/lib/admin/email-settings";

type EmailSettingsFormProps = {
  initialSettings: EmailSettingsView;
};

function toFormState(settings: EmailSettingsView) {
  return {
    emailEnabled: settings.emailEnabled,
    senderAddress: settings.senderAddress ?? "",
    smtpHost: settings.smtpHost ?? "",
    smtpPort:
      settings.smtpPort === null || settings.smtpPort === undefined
        ? ""
        : String(settings.smtpPort),
  };
}

export function EmailSettingsForm({ initialSettings }: EmailSettingsFormProps) {
  const [form, setForm] = useState(() => toFormState(initialSettings));
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [testRecipient, setTestRecipient] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const applySettings = useCallback((settings: EmailSettingsView) => {
    setSavedSettings(settings);
    setForm(toFormState(settings));
  }, []);

  const reloadSettings = async () => {
    setError(null);
    setSuccess(null);
    setReloading(true);

    try {
      const response = await fetch("/api/admin/email-settings");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to reload email settings");
      }
      applySettings(body.data as EmailSettingsView);
    } catch (reloadError) {
      setError(
        reloadError instanceof Error
          ? reloadError.message
          : "Failed to reload email settings",
      );
    } finally {
      setReloading(false);
    }
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const smtpPort =
        form.smtpPort.trim() === "" ? null : Number.parseInt(form.smtpPort, 10);

      if (form.smtpPort.trim() !== "" && Number.isNaN(smtpPort)) {
        throw new Error("SMTP port must be a number");
      }

      const response = await fetch("/api/admin/email-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled: form.emailEnabled,
          senderAddress: form.senderAddress,
          smtpHost: form.smtpHost,
          smtpPort,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save email settings");
      }

      applySettings(body.data as EmailSettingsView);
      setSuccess("Email settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save email settings",
      );
    } finally {
      setSaving(false);
    }
  };

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
    !form.emailEnabled || sendingTest || testRecipient.trim().length === 0;

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

      <form onSubmit={(event) => void saveSettings(event)} className="space-y-6">
        <div className="space-y-1">
          <label htmlFor="emailEnabled" className="text-sm font-medium text-foreground-muted">
            Enabled
          </label>
          <select
            id="emailEnabled"
            value={form.emailEnabled ? "enabled" : "disabled"}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                emailEnabled: event.target.value === "enabled",
              }))
            }
            className="w-full max-w-xs rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
          >
            <option value="disabled">Disabled</option>
            <option value="enabled">Enabled</option>
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="senderAddress" className="text-sm font-medium text-foreground-muted">
            Sender address
          </label>
          <input
            id="senderAddress"
            type="email"
            value={form.senderAddress}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                senderAddress: event.target.value,
              }))
            }
            placeholder="dizlee@metazura.com"
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="smtpHost" className="text-sm font-medium text-foreground-muted">
            SMTP host
          </label>
          <input
            id="smtpHost"
            type="text"
            value={form.smtpHost}
            onChange={(event) =>
              setForm((current) => ({ ...current, smtpHost: event.target.value }))
            }
            placeholder="smtp.titan.email"
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="smtpPort" className="text-sm font-medium text-foreground-muted">
            SMTP port
          </label>
          <input
            id="smtpPort"
            type="number"
            min={1}
            value={form.smtpPort}
            onChange={(event) =>
              setForm((current) => ({ ...current, smtpPort: event.target.value }))
            }
            placeholder="587"
            className="w-full max-w-xs rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        <p className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground-muted">
          Outbound mail is sent as Dizlee. SMTP username and password are set in
          server environment variables, not stored in the database.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || reloading}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void reloadSettings()}
            disabled={saving || reloading}
            className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted disabled:opacity-60"
          >
            {reloading ? "Reloading…" : "Reload"}
          </button>
        </div>
      </form>

      <section className="space-y-4 border-t border-border pt-6">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">Send test email</h2>
          <p className="text-sm text-foreground-muted">
            Save settings with email enabled, then send a test message to verify
            delivery.
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

      <p className="text-xs text-foreground-subtle">
        Last saved: {savedSettings.emailEnabled ? "Enabled" : "Disabled"}
        {savedSettings.smtpHost ? ` · ${savedSettings.smtpHost}` : ""}
        {savedSettings.smtpPort ? `:${savedSettings.smtpPort}` : ""}
      </p>
    </div>
  );
}
