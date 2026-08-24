import { EmailSettingsForm } from "@/components/admin/email-settings-form";
import { PageCard, PageHeader, FormLayout } from "@/components/ui/page";
import {
  EmailSettingsError,
  getEmailSettings,
  type EmailSettingsView,
} from "@/lib/admin/email-settings";
import { ui } from "@/lib/ui/classes";

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
      <PageCard>
        <FormLayout>
          <PageHeader title="Email Notification Settings" />
          <p className={ui.alertError}>{errorMessage}</p>
        </FormLayout>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <FormLayout>
        <PageHeader
          title="Email Notification Settings"
          description={
            <>
              Configure SMTP host, port, and sender. Credentials stay in{" "}
              <code>.env</code>.
            </>
          }
        />
        <EmailSettingsForm initialSettings={settings!} />
      </FormLayout>
    </PageCard>
  );
}
