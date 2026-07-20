import { ReminderSettingsForm } from "@/components/admin/reminder-settings-form";
import {
  getReminderSettings,
  ReminderSettingsError,
  type ReminderSettingsView,
} from "@/lib/admin/reminder-settings";

export default async function AdminReminderSettingsPage() {
  let settings: ReminderSettingsView | null = null;
  let errorMessage: string | null = null;

  try {
    settings = await getReminderSettings();
  } catch (error) {
    errorMessage =
      error instanceof ReminderSettingsError
        ? error.message
        : "Application settings could not be loaded.";
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">Reminder Settings</h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reminder Settings</h1>
        <p className="text-sm text-foreground-muted">
          Configure intimations (before due day) and reminders (after due day).
          Each step picks a day of month, email template, and audience.
        </p>
      </div>

      <ReminderSettingsForm initialSettings={settings!} />
    </div>
  );
}
