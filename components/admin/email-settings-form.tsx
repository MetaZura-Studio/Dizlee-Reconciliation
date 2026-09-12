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

const MASK = "••••••••";

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
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [editingCredentials, setEditingCredentials] = useState(
    () => !initialSettings.smtpCredentialsFromDb,
  );
  const [testRecipient, setTestRecipient] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const credentialsSaved = savedSettings.smtpCredentialsFromDb;
  const credentialsAvailable =
    savedSettings.smtpUserConfigured && savedSettings.smtpPasswordConfigured;

  const applySettings = useCallback((settings: EmailSettingsView) => {
    setSavedSettings(settings);
    setForm(toFormState(settings));
    setEditingCredentials(!settings.smtpCredentialsFromDb);
    setSmtpUser("");
    setSmtpPassword("");
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
      toast.success("Settings reloaded.");
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

      const payload: Record<string, unknown> = {
        emailEnabled: form.emailEnabled,
        smtpHost: form.smtpHost.trim() || null,
        smtpPort,
        senderAddress: form.senderAddress.trim() || null,
      };

      if (editingCredentials) {
        const user = smtpUser.trim();
        const password = smtpPassword;
        if (user || password) {
          payload.smtpUser = user || null;
          payload.smtpPassword = password || null;
        } else if (form.emailEnabled && !credentialsSaved) {
          throw new Error("Enter SMTP user and password");
        }
      }

      const response = await fetch("/api/admin/email-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const startEditCredentials = () => {
    setSmtpUser("");
    setSmtpPassword("");
    setEditingCredentials(true);
  };

  const cancelEditCredentials = () => {
    setSmtpUser("");
    setSmtpPassword("");
    if (credentialsSaved) {
      setEditingCredentials(false);
    }
  };

  const testDisabled =
    !savedSettings.emailEnabled ||
    sendingTest ||
    testRecipient.trim().length === 0 ||
    !credentialsAvailable;

  return (
    <div className="space-y-8">
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <form onSubmit={(event) => void saveSettings(event)} className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-foreground">SMTP settings</h2>
          <p className="text-sm text-foreground-muted">
            Configure outbound email. The password is stored encrypted and is
            never shown again after you save.
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <FieldLegend required={form.emailEnabled}>SMTP host</FieldLegend>
            <input
              type="text"
              value={form.smtpHost}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  smtpHost: event.target.value,
                }))
              }
              placeholder="smtp.titan.email"
              className={ui.input}
              autoComplete="off"
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
                setForm((current) => ({
                  ...current,
                  smtpPort: event.target.value,
                }))
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
              autoComplete="off"
            />
          </label>
        </div>

        <div className={`${ui.sectionCard} space-y-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-0.5">
              <h3 className="text-sm font-semibold text-foreground">
                SMTP credentials
              </h3>
              <p className="text-xs text-foreground-subtle">
                {editingCredentials
                  ? "Enter user and password together, then save settings."
                  : credentialsSaved
                    ? "Credentials are saved. Click Edit to replace them."
                    : "Add the SMTP login used by your mail provider."}
              </p>
            </div>
            {credentialsSaved && !editingCredentials ? (
              <Button
                type="button"
                variant="secondary"
                onClick={startEditCredentials}
                disabled={saving}
                className="shrink-0"
              >
                Edit
              </Button>
            ) : null}
            {credentialsSaved && editingCredentials ? (
              <Button
                type="button"
                variant="secondary"
                onClick={cancelEditCredentials}
                disabled={saving}
                className="shrink-0"
              >
                Cancel
              </Button>
            ) : null}
          </div>

          {editingCredentials ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <FieldLegend required={form.emailEnabled && !credentialsSaved}>
                  SMTP user
                </FieldLegend>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(event) => setSmtpUser(event.target.value)}
                  placeholder="smtp-user@example.com"
                  className={ui.input}
                  autoComplete="off"
                />
              </label>
              <label className="block text-sm">
                <FieldLegend required={form.emailEnabled && !credentialsSaved}>
                  SMTP password
                </FieldLegend>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(event) => setSmtpPassword(event.target.value)}
                  placeholder="Enter password"
                  className={ui.input}
                  autoComplete="new-password"
                />
              </label>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-surface px-3.5 py-3">
                <p className="text-xs font-semibold tracking-wide text-foreground-muted">
                  SMTP user
                </p>
                <p className="mt-1.5 font-mono text-sm tracking-widest text-foreground">
                  {MASK}
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface px-3.5 py-3">
                <p className="text-xs font-semibold tracking-wide text-foreground-muted">
                  SMTP password
                </p>
                <p className="mt-1.5 font-mono text-sm tracking-widest text-foreground">
                  {MASK}
                </p>
              </div>
            </div>
          )}
        </div>

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
            Sends a test message using the saved SMTP settings above.
          </p>
        </div>

        {!credentialsAvailable ? (
          <p className={ui.alertWarning}>
            Enter and save SMTP user and password above before sending a test.
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
