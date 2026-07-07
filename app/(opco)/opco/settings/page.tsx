import Link from "next/link";

import { requireOpcoSession } from "@/lib/opco/auth";

export default async function OpcoSettingsPage() {
  await requireOpcoSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-zinc-600">Manage your OpCo account preferences.</p>
      </div>

      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
        <h2 className="font-medium text-zinc-900">Account security</h2>
        <p className="mt-2">
          Update your password using the shared account settings page.
        </p>
        <Link
          href="/change-password"
          className="mt-4 inline-block rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Change password
        </Link>
      </div>
    </div>
  );
}
