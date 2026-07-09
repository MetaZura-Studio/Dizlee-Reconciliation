import Link from "next/link";

import { requirePartnerSession } from "@/lib/partner/auth";

export default async function PartnerSettingsPage() {
  await requirePartnerSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-foreground-muted">
          Manage your partner account preferences.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-6 text-sm text-foreground-muted">
        <h2 className="font-medium text-foreground">Account security</h2>
        <p className="mt-2">
          Update your password using the shared account settings page.
        </p>
        <Link
          href="/change-password"
          className="mt-4 inline-block rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Change password
        </Link>
      </div>
    </div>
  );
}
