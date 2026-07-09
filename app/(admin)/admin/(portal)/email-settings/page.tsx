import { EmailSettingsForm } from "@/components/admin/email-settings-form";
import {
  EmailSettingsError,
  getEmailSettings,
  type EmailSettingsView,
} from "@/lib/admin/email-settings";

export default async function AdminEmailSettingsPage() {
  let settings: EmailSettingsView | null = null;
  let errorMessage: string | null = null;

  try {
    settings = await getEmailSettings();
  } catch (error) {
    errorMessage =
      error instanceof EmailSettingsError
        ? error.message
        : "Application settings could not be loaded.";
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Email Notification Settings
        </h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Email Notification Settings
        </h1>
        <p className="text-sm text-foreground-muted">Admin-only system setting.</p>
      </div>

      <EmailSettingsForm initialSettings={settings!} />
    </div>
  );
}
