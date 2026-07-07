import { EmailSettingsForm } from "@/components/admin/email-settings-form";
import { EmailSettingsError, getEmailSettings } from "@/lib/admin/email-settings";

export default async function AdminEmailSettingsPage() {
  try {
    const settings = await getEmailSettings();

    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Email Notification Settings
          </h1>
          <p className="text-sm text-zinc-600">Admin-only system setting.</p>
        </div>

        <EmailSettingsForm initialSettings={settings} />
      </div>
    );
  } catch (error) {
    const message =
      error instanceof EmailSettingsError
        ? error.message
        : "Application settings could not be loaded.";

    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Email Notification Settings
        </h1>
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      </div>
    );
  }
}
