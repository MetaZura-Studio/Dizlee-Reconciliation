import { ReminderSettingsForm } from "@/components/admin/reminder-settings-form";
import { PageCard, PageHeader, FormLayout, HelpPanel } from "@/components/ui/page";
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
          description="Monthly emails for report submission: due day, intimations before, and reminders after."
        />
        <HelpPanel title="Example">
          <p>
            Due day 10 → send intimation on the 7th and reminder on the 11th.
          </p>
        </HelpPanel>
        <ReminderSettingsForm initialSettings={settings!} />
      </FormLayout>
    </PageCard>
  );
}
