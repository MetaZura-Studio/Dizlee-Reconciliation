"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  eventLabel,
  templateForEventStep,
  type EventSchedule,
  type NotificationEventCode,
  type NotificationSchedules,
  type ScheduleStep,
} from "@/lib/admin/notification-schedules.shared";
import type { ReminderSettingsView } from "@/lib/admin/reminder-settings";
import { ui } from "@/lib/ui/classes";

type ReminderSettingsFormProps = {
  initialSettings: ReminderSettingsView;
};

function newStepId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortSteps(steps: ScheduleStep[]): ScheduleStep[] {
  return [...steps].sort((a, b) => b.offsetDays - a.offsetDays);
}

export function ReminderSettingsForm({
  initialSettings,
}: ReminderSettingsFormProps) {
  const [remindersEnabled, setRemindersEnabled] = useState(
    initialSettings.remindersEnabled,
  );
  const [schedules, setSchedules] = useState<NotificationSchedules>(
    initialSettings.schedules,
  );
  const [selectedEvent, setSelectedEvent] = useState<NotificationEventCode>(
    "REPORT",
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const activeSchedule =
    schedules.find((schedule) => schedule.eventCode === selectedEvent) ??
    schedules[0];

  const applySettings = useCallback((settings: ReminderSettingsView) => {
    setRemindersEnabled(settings.remindersEnabled);
    setSchedules(settings.schedules);
  }, []);

  const updateActiveSchedule = (
    updater: (current: EventSchedule) => EventSchedule,
  ) => {
    setSchedules((current) =>
      current.map((schedule) =>
        schedule.eventCode === selectedEvent ? updater(schedule) : schedule,
      ),
    );
  };

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
      setSuccess("Reminder settings reloaded.");
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
      const response = await fetch("/api/admin/reminder-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          remindersEnabled,
          reminderUnit: "days",
          schedules,
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

  if (!activeSchedule) {
    return <p className={ui.alertError}>No event schedules configured.</p>;
  }

  return (
    <div className="space-y-6">
      {error ? <p className={ui.alertError}>{error}</p> : null}
      {success ? <p className={ui.alertSuccess}>{success}</p> : null}

      <form onSubmit={(event) => void saveSettings(event)} className="space-y-6">
        <div className="space-y-1">
          <label htmlFor="remindersEnabled" className={ui.label}>
            Automatic sending
          </label>
          <select
            id="remindersEnabled"
            value={remindersEnabled ? "enabled" : "disabled"}
            onChange={(event) =>
              setRemindersEnabled(event.target.value === "enabled")
            }
            className={`${ui.select} max-w-xs`}
          >
            <option value="disabled">Disabled</option>
            <option value="enabled">Enabled</option>
          </select>
          <p className={ui.hint}>
            Master switch for the daily cron. Each event below can still be
            enabled or disabled on its own.
          </p>
        </div>

        <div className="space-y-2">
          <p className={ui.label}>Event</p>
          <div className="flex flex-wrap gap-2">
            {schedules.map((schedule) => (
              <button
                key={schedule.eventCode}
                type="button"
                onClick={() => setSelectedEvent(schedule.eventCode)}
                className={`rounded-2xl border px-3 py-2 text-sm transition-colors ${
                  selectedEvent === schedule.eventCode
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground-muted hover:bg-surface-muted"
                }`}
              >
                {eventLabel(schedule.eventCode)}
                {!schedule.enabled ? " (off)" : ""}
              </button>
            ))}
          </div>
        </div>

        <section className={`space-y-4 ${ui.cardPaddingLg}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-foreground">
                {eventLabel(activeSchedule.eventCode)}
              </h2>
              <p className="text-sm text-foreground-muted">
                Intimations use{" "}
                <code>
                  {templateForEventStep(activeSchedule.eventCode, "INTIMATION")}
                </code>
                ; post-due reminders use{" "}
                <code>
                  {templateForEventStep(activeSchedule.eventCode, "REMINDER")}
                </code>
                .
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={activeSchedule.enabled}
                onChange={(event) =>
                  updateActiveSchedule((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-border-strong"
              />
              <span className="text-foreground-muted">Event enabled</span>
            </label>
          </div>

          <label className="block max-w-xs text-sm">
            <span className={ui.label}>Due day of month</span>
            <input
              type="number"
              min={1}
              max={28}
              value={activeSchedule.dueDayOfMonth}
              onChange={(event) =>
                updateActiveSchedule((current) => ({
                  ...current,
                  dueDayOfMonth: Number.parseInt(event.target.value, 10) || 1,
                }))
              }
              className={ui.input}
            />
            <span className={`mt-1 block ${ui.hint}`}>
              Example: due day 10 → intimations fire before the 10th; reminders
              fire after the 10th.
            </span>
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Intimations (before due date)
              </h3>
              <button
                type="button"
                onClick={() =>
                  updateActiveSchedule((current) => ({
                    ...current,
                    intimations: sortSteps([
                      ...current.intimations,
                      {
                        id: newStepId("intimation"),
                        offsetDays: 1,
                      },
                    ]),
                  }))
                }
                className="rounded-2xl border border-border px-2.5 py-1 text-xs text-foreground-muted hover:bg-surface-muted"
              >
                Add intimation
              </button>
            </div>
            {activeSchedule.intimations.length === 0 ? (
              <p className={ui.hint}>No intimations configured.</p>
            ) : (
              <ul className="space-y-2">
                {activeSchedule.intimations.map((step, index) => (
                  <li
                    key={step.id}
                    className={`flex flex-wrap items-center gap-3 ${ui.cardPadding} py-2`}
                  >
                    <span className="text-sm text-foreground-muted">
                      #{index + 1} — send
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={step.offsetDays}
                      onChange={(event) => {
                        const offsetDays =
                          Number.parseInt(event.target.value, 10) || 1;
                        updateActiveSchedule((current) => ({
                          ...current,
                          intimations: sortSteps(
                            current.intimations.map((item) =>
                              item.id === step.id
                                ? { ...item, offsetDays }
                                : item,
                            ),
                          ),
                        }));
                      }}
                      className={`${ui.input} w-20 px-2 py-1`}
                    />
                    <span className="text-sm text-foreground-muted">
                      day(s) before due date
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveSchedule((current) => ({
                          ...current,
                          intimations: current.intimations.filter(
                            (item) => item.id !== step.id,
                          ),
                        }))
                      }
                      className="ml-auto text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Reminders (after due date)
              </h3>
              <button
                type="button"
                onClick={() =>
                  updateActiveSchedule((current) => ({
                    ...current,
                    reminders: sortSteps([
                      ...current.reminders,
                      {
                        id: newStepId("reminder"),
                        offsetDays: 1,
                      },
                    ]),
                  }))
                }
                className="rounded-2xl border border-border px-2.5 py-1 text-xs text-foreground-muted hover:bg-surface-muted"
              >
                Add reminder
              </button>
            </div>
            {activeSchedule.reminders.length === 0 ? (
              <p className={ui.hint}>No post-due reminders configured.</p>
            ) : (
              <ul className="space-y-2">
                {activeSchedule.reminders.map((step, index) => (
                  <li
                    key={step.id}
                    className={`flex flex-wrap items-center gap-3 ${ui.cardPadding} py-2`}
                  >
                    <span className="text-sm text-foreground-muted">
                      #{index + 1} — send
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={step.offsetDays}
                      onChange={(event) => {
                        const offsetDays =
                          Number.parseInt(event.target.value, 10) || 1;
                        updateActiveSchedule((current) => ({
                          ...current,
                          reminders: sortSteps(
                            current.reminders.map((item) =>
                              item.id === step.id
                                ? { ...item, offsetDays }
                                : item,
                            ),
                          ),
                        }));
                      }}
                      className={`${ui.input} w-20 px-2 py-1`}
                    />
                    <span className="text-sm text-foreground-muted">
                      day(s) after due date
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateActiveSchedule((current) => ({
                          ...current,
                          reminders: current.reminders.filter(
                            (item) => item.id !== step.id,
                          ),
                        }))
                      }
                      className="ml-auto text-xs text-danger hover:underline"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className={`${ui.cardPadding} text-sm text-foreground-muted`}>
          The daily cron checks today against each step. Intimations go to all
          OpCos/Partners. Post-due reminders go only to parties still missing a
          report or invoice for the current month.
        </p>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving || reloading}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void reloadSettings()}
            disabled={saving || reloading}
          >
            {reloading ? "Reloading…" : "Reload"}
          </Button>
        </div>
      </form>
    </div>
  );
}
