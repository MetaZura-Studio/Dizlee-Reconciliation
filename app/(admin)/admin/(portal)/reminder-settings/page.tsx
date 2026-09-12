import { ReminderSettingsForm } from "@/components/admin/reminder-settings-form";
import { PageCard, PageHeader, FormLayout } from "@/components/ui/page";
import {
  getReminderSettings,
  ReminderSettingsError,
  type ReminderSettingsView,
} from "@/lib/admin/reminder-settings";
import { ui } from "@/lib/ui/classes";

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
      <PageCard>
        <FormLayout>
          <PageHeader title="Reminder Settings" />
          <p className={ui.alertError}>{errorMessage}</p>
        </FormLayout>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <FormLayout>
        <PageHeader
          title="Reminder Settings"
          description="Control automatic monthly report emails: turn sending on or off, set the report due day, and schedule notices before and reminders after that date."
        />
        <ReminderSettingsForm initialSettings={settings!} />
      </FormLayout>
    </PageCard>
  );
}
