"use client";

import { useCallback, useState } from "react";

import {
  formatReminderSchedule,
  type ReminderUnit,
} from "@/lib/admin/reminder-duration";
import type { ReminderSettingsView } from "@/lib/admin/reminder-settings";

type ReminderSettingsFormProps = {
  initialSettings: ReminderSettingsView;
};

function toFormState(settings: ReminderSettingsView) {
  const unit: ReminderUnit =
    settings.reminderUnit === "weeks" ? "weeks" : "days";

  return {
    remindersEnabled: settings.remindersEnabled,
    reminderValue:
      settings.reminderValue === null || settings.reminderValue === undefined
        ? ""
        : String(settings.reminderValue),
    reminderUnit: unit,
  };
}

export function ReminderSettingsForm({
  initialSettings,
}: ReminderSettingsFormProps) {
  const [form, setForm] = useState(() => toFormState(initialSettings));
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const applySettings = useCallback((settings: ReminderSettingsView) => {
    setSavedSettings(settings);
    setForm(toFormState(settings));
  }, []);

  const reloadSettings = async () => {
    setError(null);
    setSuccess(null);
    setReloading(true);

    try {
      const response = await fetch("/api/admin/reminder-settings");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to reload reminder settings");
      }
      applySettings(body.data as ReminderSettingsView);
    } catch (reloadError) {
      setError(
        reloadError instanceof Error
          ? reloadError.message
          : "Failed to reload reminder settings",
      );
    } finally {
      setReloading(false);
    }
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const reminderValue =
        form.reminderValue.trim() === ""
          ? null
          : Number.parseInt(form.reminderValue, 10);

      if (form.reminderValue.trim() !== "" && Number.isNaN(reminderValue)) {
        throw new Error("Reminder value must be a number");
      }

      if (reminderValue !== null && reminderValue < 1) {
        throw new Error("Reminder value must be at least 1");
      }

      const response = await fetch("/api/admin/reminder-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remindersEnabled: form.remindersEnabled,
          reminderValue,
          reminderUnit: form.reminderUnit,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save reminder settings");
      }

      applySettings(body.data as ReminderSettingsView);
      setSuccess("Reminder settings saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save reminder settings",
      );
    } finally {
      setSaving(false);
    }
  };

  const savedSchedule = formatReminderSchedule(
    savedSettings.reminderValue,
    savedSettings.reminderUnit,
  );

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      ) : null}

      <form onSubmit={(event) => void saveSettings(event)} className="space-y-6">
        <div className="space-y-1">
          <label
            htmlFor="remindersEnabled"
            className="text-sm font-medium text-zinc-700"
          >
            Enabled
          </label>
          <select
            id="remindersEnabled"
            value={form.remindersEnabled ? "enabled" : "disabled"}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                remindersEnabled: event.target.value === "enabled",
              }))
            }
            className="w-full max-w-xs rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
          >
            <option value="disabled">Disabled</option>
            <option value="enabled">Enabled</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label
              htmlFor="reminderValue"
              className="text-sm font-medium text-zinc-700"
            >
              Reminder value
            </label>
            <input
              id="reminderValue"
              type="number"
              min={1}
              value={form.reminderValue}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reminderValue: event.target.value,
                }))
              }
              placeholder="3"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>

          <div className="space-y-1">
            <label
              htmlFor="reminderUnit"
              className="text-sm font-medium text-zinc-700"
            >
              Reminder unit
            </label>
            <select
              id="reminderUnit"
              value={form.reminderUnit}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  reminderUnit: event.target.value as ReminderUnit,
                }))
              }
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
        </div>

        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
          Automatic reminders apply after the{" "}
          <span className="font-medium">1st day of the reporting period</span>.
          Example: value 3 + days means eligible from the 4th of the month if
          uploads are still missing. Sending is handled by the Dizlee reminders
          workflow and the future automatic scheduler (UC-07).
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || reloading}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => void reloadSettings()}
            disabled={saving || reloading}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
          >
            {reloading ? "Reloading…" : "Reload"}
          </button>
        </div>
      </form>

      <p className="text-xs text-zinc-500">
        Last saved: {savedSettings.remindersEnabled ? "Enabled" : "Disabled"}
        {savedSettings.remindersEnabled && savedSchedule
          ? ` · Schedule: ${savedSchedule} after period start`
          : ""}
      </p>
    </div>
  );
}
