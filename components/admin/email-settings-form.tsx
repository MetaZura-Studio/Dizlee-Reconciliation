"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel, FieldLegend } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { EmailSettingsView } from "@/lib/admin/email-settings";
import { ui } from "@/lib/ui/classes";
import { formatAppError } from "@/lib/errors/format";

type EmailSettingsFormProps = {
  initialSettings: EmailSettingsView;
};

function toFormState(settings: EmailSettingsView) {
  return {
    emailEnabled: settings.emailEnabled,
    smtpHost: settings.smtpHost ?? "",
    smtpPort:
      settings.smtpPort === null || settings.smtpPort === undefined
        ? "587"
        : String(settings.smtpPort),
    senderAddress: settings.senderAddress ?? "",
  };
}

export function EmailSettingsForm({ initialSettings }: EmailSettingsFormProps) {
  const toast = useToast();
  const [form, setForm] = useState(() => toFormState(initialSettings));
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [testRecipient, setTestRecipient] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const applySettings = useCallback((settings: EmailSettingsView) => {
    setSavedSettings(settings);
    setForm(toFormState(settings));
  }, []);

  const reloadSettings = async () => {
    setError(null);
    setReloading(true);

    try {
      const response = await fetch("/api/admin/email-settings");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to reload email settings"));
      }
      applySettings(body.data as EmailSettingsView);
      toast.success("Settings reloaded (DB values, with .env fallback when empty).");
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
    setSaving(true);

    try {
      const smtpPort = Number.parseInt(form.smtpPort, 10);
      if (Number.isNaN(smtpPort)) {
        throw new Error("SMTP port must be a number");
      }

      const response = await fetch("/api/admin/email-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled: form.emailEnabled,
          smtpHost: form.smtpHost.trim() || null,
          smtpPort,
          senderAddress: form.senderAddress.trim() || null,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to save email settings"));
      }

      applySettings(body.data as EmailSettingsView);
      toast.success("Email settings saved.");
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
        throw new Error(formatAppError(body, "Failed to send test email"));
      }
      toast.success(body.message as string);
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

  const credentialsReady =
    savedSettings.smtpUserConfigured && savedSettings.smtpPasswordConfigured;
  const testDisabled =
    !savedSettings.emailEnabled ||
    sendingTest ||
    testRecipient.trim().length === 0 ||
    !credentialsReady;

  return (
    <div className="space-y-8">
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <form onSubmit={(event) => void saveSettings(event)} className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">SMTP settings</h2>
          <p className="text-sm text-foreground-muted">
            Host, port, sender, and enable flag are saved in the database. Fields
            are prefilled from <code>.env</code> when DB values are empty.
            <code> SMTP_USER</code> and <code>SMTP_PASSWORD</code> stay in{" "}
            <code>.env</code> only.
          </p>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.emailEnabled}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                emailEnabled: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-border-strong"
          />
          <span className="font-medium text-foreground-muted">
            Enable outbound email
          </span>
        </label>

        <label className="block text-sm">
          <FieldLegend required={form.emailEnabled}>SMTP host</FieldLegend>
          <input
            type="text"
            value={form.smtpHost}
            onChange={(event) =>
              setForm((current) => ({ ...current, smtpHost: event.target.value }))
            }
            placeholder="smtp.titan.email"
            className={ui.input}
          />
        </label>

        <label className="block text-sm">
          <FieldLegend required={form.emailEnabled}>SMTP port</FieldLegend>
          <input
            type="number"
            min={1}
            max={65535}
            value={form.smtpPort}
            onChange={(event) =>
              setForm((current) => ({ ...current, smtpPort: event.target.value }))
            }
            placeholder="465"
            className={ui.input}
          />
        </label>

        <label className="block text-sm">
          <FieldLegend required={form.emailEnabled}>Sender address</FieldLegend>
          <input
            type="email"
            value={form.senderAddress}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                senderAddress: event.target.value,
              }))
            }
            placeholder="noreply@dizlee.com"
            className={ui.input}
          />
        </label>

        <dl className={`grid gap-3 ${ui.filterToolbar} text-sm`}>
          <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium text-foreground-muted">SMTP_USER</dt>
            <dd>
              {savedSettings.smtpUserConfigured
                ? "Configured in .env"
                : "Not set in .env"}
            </dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
            <dt className="font-medium text-foreground-muted">SMTP_PASSWORD</dt>
            <dd>
              {savedSettings.smtpPasswordConfigured
                ? "Configured in .env"
                : "Not set in .env"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save settings"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void reloadSettings()}
            disabled={reloading || saving}
          >
            {reloading ? "Reloading…" : "Reload"}
          </Button>
        </div>
      </form>

      <section className="space-y-4 border-t border-border pt-6">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">Send test email</h2>
          <p className="text-sm text-foreground-muted">
            Uses saved settings plus <code>SMTP_USER</code> /{" "}
            <code>SMTP_PASSWORD</code> from <code>.env</code>.
          </p>
        </div>

        {!credentialsReady ? (
          <p className={ui.alertWarning}>
            Set <code>SMTP_USER</code> and <code>SMTP_PASSWORD</code> in{" "}
            <code>.env</code>, then restart the server before sending a test.
          </p>
        ) : null}

        <div className="space-y-1">
          <FieldLabel htmlFor="testRecipient" required>
            Send test email to
          </FieldLabel>
          <input
            id="testRecipient"
            type="email"
            value={testRecipient}
            onChange={(event) => setTestRecipient(event.target.value)}
            placeholder="you@example.com"
            className={ui.input}
          />
        </div>

        <Button type="button" onClick={() => void sendTest()} disabled={testDisabled}>
          {sendingTest ? "Sending…" : "Send test email"}
        </Button>
      </section>
    </div>
  );
}
