"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLegend } from "@/components/ui/field";
import {
  audienceLabel,
  canAddIntimation,
  canAddReminder,
  clampScheduleToDueDay,
  defaultIntimationDay,
  defaultReminderDay,
  defaultTemplateForKind,
  maxIntimationDay,
  minReminderDay,
  SCHEDULE_AUDIENCES,
  type NotificationSchedule,
  type ScheduleAudience,
  type ScheduleStep,
  type ScheduleTemplateOption,
} from "@/lib/admin/notification-schedules.shared";
import type { ReminderSettingsView } from "@/lib/admin/reminder-settings";
import { ui } from "@/lib/ui/classes";

type ReminderSettingsFormProps = {
  initialSettings: ReminderSettingsView;
};

function newStepId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sortIntimations(steps: ScheduleStep[]): ScheduleStep[] {
  return [...steps].sort((a, b) => a.dayOfMonth - b.dayOfMonth);
}

function sortReminders(steps: ScheduleStep[]): ScheduleStep[] {
  return [...steps].sort((a, b) => a.dayOfMonth - b.dayOfMonth);
}

function defaultTemplateCode(
  options: ScheduleTemplateOption[],
  fallback: string,
): string {
  return options[0]?.code ?? fallback;
}

function dayOptions(min: number, max: number): number[] {
  if (max < min) {
    return [];
  }
  const days: number[] = [];
  for (let day = min; day <= max; day += 1) {
    days.push(day);
  }
  return days;
}

export function ReminderSettingsForm({
  initialSettings,
}: ReminderSettingsFormProps) {
  const [remindersEnabled, setRemindersEnabled] = useState(
    initialSettings.remindersEnabled,
  );
  const [schedule, setSchedule] = useState<NotificationSchedule>(
    initialSettings.schedule,
  );
  const [templateOptions, setTemplateOptions] = useState(
    initialSettings.templateOptions,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const applySettings = useCallback((settings: ReminderSettingsView) => {
    setRemindersEnabled(settings.remindersEnabled);
    setSchedule(settings.schedule);
    setTemplateOptions(settings.templateOptions);
  }, []);

  const updateSchedule = (
    updater: (current: NotificationSchedule) => NotificationSchedule,
  ) => {
    setSchedule((current) => updater(current));
  };

  const setDueDay = (dueDayOfMonth: number) => {
    updateSchedule((current) =>
      clampScheduleToDueDay({
        ...current,
        dueDayOfMonth,
      }),
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
          schedule,
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

  const due = schedule.dueDayOfMonth;
  const intimationDays = dayOptions(1, maxIntimationDay(due));
  const reminderDays = dayOptions(minReminderDay(due), 28);
  const intimationsAllowed = canAddIntimation(due);
  const remindersAllowed = canAddReminder(due);

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
            Master switch for the daily cron. When enabled, due intimations and
            reminders below are sent automatically.
          </p>
        </div>

        <section className={`space-y-4 ${ui.cardPaddingLg}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-foreground">Schedule</h2>
              <p className="text-sm text-foreground-muted">
                Intimations can only use days before the due day. Reminders can
                only use days after it.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={schedule.enabled}
                onChange={(event) =>
                  updateSchedule((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-border-strong"
              />
              <span className="text-foreground-muted">Schedule enabled</span>
            </label>
          </div>

          <label className="block max-w-xs text-sm">
            <FieldLegend required>Due day of month</FieldLegend>
            <input
              type="number"
              min={1}
              max={28}
              value={schedule.dueDayOfMonth}
              onChange={(event) =>
                setDueDay(Number.parseInt(event.target.value, 10) || 1)
              }
              className={ui.input}
            />
            <span className={`mt-1 block ${ui.hint}`}>
              Intimations: days 1–{Math.max(0, due - 1) || "—"}. Reminders: days{" "}
              {due >= 28 ? "—" : `${due + 1}–28`}.
            </span>
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">
                Intimations (before due date)
              </h3>
              <button
                type="button"
                disabled={!intimationsAllowed}
                onClick={() =>
                  updateSchedule((current) => ({
                    ...current,
                    intimations: sortIntimations([
                      ...current.intimations,
                      {
                        id: newStepId("intimation"),
                        dayOfMonth: defaultIntimationDay(current.dueDayOfMonth),
                        templateCode: defaultTemplateCode(
                          templateOptions.intimations,
                          defaultTemplateForKind("INTIMATION"),
                        ),
                        audience: "both",
                      },
                    ]),
                  }))
                }
                className="rounded-2xl border border-border px-2.5 py-1 text-xs text-foreground-muted hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add intimation
              </button>
            </div>
            {!intimationsAllowed ? (
              <p className={ui.hint}>
                Raise the due day above the 1st to add intimations before it.
              </p>
            ) : null}
            {schedule.intimations.length === 0 ? (
              <p className={ui.hint}>No intimations configured.</p>
            ) : (
              <ul className="space-y-2">
                {schedule.intimations.map((step, index) => (
                  <ScheduleStepRow
                    key={step.id}
                    index={index}
                    step={step}
                    dayOptions={intimationDays}
                    dayHint={`of month (before due day ${due})`}
                    templateOptions={templateOptions.intimations}
                    onChange={(next) =>
                      updateSchedule((current) => ({
                        ...current,
                        intimations: sortIntimations(
                          current.intimations.map((item) =>
                            item.id === step.id ? next : item,
                          ),
                        ),
                      }))
                    }
                    onRemove={() =>
                      updateSchedule((current) => ({
                        ...current,
                        intimations: current.intimations.filter(
                          (item) => item.id !== step.id,
                        ),
                      }))
                    }
                  />
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
                disabled={!remindersAllowed}
                onClick={() =>
                  updateSchedule((current) => ({
                    ...current,
                    reminders: sortReminders([
                      ...current.reminders,
                      {
                        id: newStepId("reminder"),
                        dayOfMonth: defaultReminderDay(current.dueDayOfMonth),
                        templateCode: defaultTemplateCode(
                          templateOptions.reminders,
                          defaultTemplateForKind("REMINDER"),
                        ),
                        audience: "both",
                      },
                    ]),
                  }))
                }
                className="rounded-2xl border border-border px-2.5 py-1 text-xs text-foreground-muted hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add reminder
              </button>
            </div>
            {!remindersAllowed ? (
              <p className={ui.hint}>
                Lower the due day below the 28th to add reminders after it.
              </p>
            ) : null}
            {schedule.reminders.length === 0 ? (
              <p className={ui.hint}>No post-due reminders configured.</p>
            ) : (
              <ul className="space-y-2">
                {schedule.reminders.map((step, index) => (
                  <ScheduleStepRow
                    key={step.id}
                    index={index}
                    step={step}
                    dayOptions={reminderDays}
                    dayHint={`of month (after due day ${due})`}
                    templateOptions={templateOptions.reminders}
                    onChange={(next) =>
                      updateSchedule((current) => ({
                        ...current,
                        reminders: sortReminders(
                          current.reminders.map((item) =>
                            item.id === step.id ? next : item,
                          ),
                        ),
                      }))
                    }
                    onRemove={() =>
                      updateSchedule((current) => ({
                        ...current,
                        reminders: current.reminders.filter(
                          (item) => item.id !== step.id,
                        ),
                      }))
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <p className={`${ui.cardPadding} text-sm text-foreground-muted`}>
          The daily cron sends each step on its chosen day of the month, using
          the selected template and audience.
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

function ScheduleStepRow({
  index,
  step,
  dayOptions: days,
  dayHint,
  templateOptions,
  onChange,
  onRemove,
}: {
  index: number;
  step: ScheduleStep;
  dayOptions: number[];
  dayHint: string;
  templateOptions: ScheduleTemplateOption[];
  onChange: (next: ScheduleStep) => void;
  onRemove: () => void;
}) {
  const options =
    days.includes(step.dayOfMonth) || days.length === 0
      ? days
      : [...days, step.dayOfMonth].sort((a, b) => a - b);

  return (
    <li className={`flex flex-wrap items-center gap-3 ${ui.cardPadding} py-2`}>
      <span className="text-sm text-foreground-muted">#{index + 1} — send on day</span>
      <select
        value={step.dayOfMonth}
        onChange={(event) =>
          onChange({
            ...step,
            dayOfMonth: Number.parseInt(event.target.value, 10),
          })
        }
        className={`${ui.select} w-24`}
        aria-label="Day of month"
      >
        {options.map((day) => (
          <option key={day} value={day}>
            {day}
          </option>
        ))}
      </select>
      <span className="text-sm text-foreground-muted">{dayHint}</span>
      <select
        value={step.templateCode}
        onChange={(event) =>
          onChange({ ...step, templateCode: event.target.value })
        }
        className={`${ui.select} min-w-[12rem] max-w-xs`}
        aria-label="Template"
      >
        {!templateOptions.some((option) => option.code === step.templateCode) ? (
          <option value={step.templateCode}>{step.templateCode}</option>
        ) : null}
        {templateOptions.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
      <select
        value={step.audience}
        onChange={(event) =>
          onChange({
            ...step,
            audience: event.target.value as ScheduleAudience,
          })
        }
        className={`${ui.select} min-w-[10rem]`}
        aria-label="Send to"
      >
        {SCHEDULE_AUDIENCES.map((audience) => (
          <option key={audience} value={audience}>
            {audienceLabel(audience)}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        className="ml-auto text-xs text-danger hover:underline"
      >
        Remove
      </button>
    </li>
  );
}
