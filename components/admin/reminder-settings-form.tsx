/**
 * Admin Reminder Settings form — guided monthly schedule for automatic intimations/reminders.
 * Keeps cron/schedule business rules; improves layout, timeline, and validation feedback.
 */

"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldLegend } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status-pill";
import { useToast } from "@/components/ui/toast";
import {
  audienceHelperText,
  audienceLabel,
  canAddIntimation,
  canAddReminder,
  clampScheduleToDueDay,
  defaultIntimationDay,
  defaultReminderDay,
  defaultTemplateForKind,
  describeAutomationStatus,
  describeDueDayClamp,
  maxIntimationDay,
  minReminderDay,
  SCHEDULE_AUDIENCES,
  type NotificationSchedule,
  type ScheduleAudience,
  type ScheduleStep,
  type ScheduleTemplateOption,
} from "@/lib/admin/notification-schedules.shared";
import type { ReminderSettingsView } from "@/lib/admin/reminder-settings";
import { updateReminderSettingsSchema } from "@/lib/admin/validation/reminder-settings";
import { cn, ui } from "@/lib/ui/classes";

type ReminderSettingsFormProps = {
  initialSettings: ReminderSettingsView;
};

type FieldErrors = Record<string, string>;

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

function snapshotKey(
  remindersEnabled: boolean,
  schedule: NotificationSchedule,
): string {
  return JSON.stringify({ remindersEnabled, schedule });
}

function fieldErrorsFromZod(error: {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}): FieldErrors {
  const next: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (!path || next[path]) {
      continue;
    }
    next[path] = issue.message;
  }
  return next;
}

function automationTone(
  kind: ReturnType<typeof describeAutomationStatus>["kind"],
): "success" | "warning" | "neutral" | "info" {
  switch (kind) {
    case "active":
      return "success";
    case "no_steps":
    case "cron_only":
      return "warning";
    case "off":
      return "neutral";
    default:
      return "info";
  }
}

export function ReminderSettingsForm({
  initialSettings,
}: ReminderSettingsFormProps) {
  const toast = useToast();
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    snapshotKey(initialSettings.remindersEnabled, initialSettings.schedule),
  );
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dueClampNotice, setDueClampNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discarding, setDiscarding] = useState(false);

  const isDirty = useMemo(
    () => snapshotKey(remindersEnabled, schedule) !== savedSnapshot,
    [remindersEnabled, schedule, savedSnapshot],
  );

  const automationStatus = useMemo(
    () => describeAutomationStatus(remindersEnabled, schedule),
    [remindersEnabled, schedule],
  );

  const applySettings = useCallback((settings: ReminderSettingsView) => {
    setRemindersEnabled(settings.remindersEnabled);
    setSchedule(settings.schedule);
    setTemplateOptions(settings.templateOptions);
    setSavedSnapshot(
      snapshotKey(settings.remindersEnabled, settings.schedule),
    );
    setDueClampNotice(null);
    setFieldErrors({});
  }, []);

  const updateSchedule = (
    updater: (current: NotificationSchedule) => NotificationSchedule,
  ) => {
    setSchedule((current) => updater(current));
  };

  const setDueDay = (dueDayOfMonth: number) => {
    const clampedDay = Math.min(28, Math.max(1, dueDayOfMonth));
    setSchedule((current) => {
      const next = clampScheduleToDueDay({
        ...current,
        dueDayOfMonth: clampedDay,
      });
      setDueClampNotice(describeDueDayClamp(current, next));
      return next;
    });
  };

  const discardChanges = async () => {
    if (!isDirty) {
      return;
    }
    const confirmed = window.confirm(
      "Discard unsaved changes and reload the last saved settings?",
    );
    if (!confirmed) {
      return;
    }

    setError(null);
    setFieldErrors({});
    setDiscarding(true);

    try {
      const response = await fetch("/api/admin/reminder-settings");
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to reload reminder settings");
      }
      applySettings(body.data as ReminderSettingsView);
      toast.success("Unsaved changes discarded.");
    } catch (reloadError) {
      setError(
        reloadError instanceof Error
          ? reloadError.message
          : "Failed to discard changes",
      );
    } finally {
      setDiscarding(false);
    }
  };

  const saveSettings = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const parsed = updateReminderSettingsSchema.safeParse({
      remindersEnabled,
      reminderUnit: "days",
      schedule,
    });

    if (!parsed.success) {
      const nextErrors = fieldErrorsFromZod(parsed.error);
      setFieldErrors(nextErrors);
      setError(
        Object.values(nextErrors)[0] ??
          "Fix the highlighted fields before saving.",
      );
      return;
    }

    setFieldErrors({});
    setSaving(true);

    try {
      const response = await fetch("/api/admin/reminder-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save reminder settings");
      }

      applySettings(body.data as ReminderSettingsView);
      toast.success("Reminder settings saved.");
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
  const isSending = remindersEnabled && schedule.enabled;

  const setSending = (on: boolean) => {
    setRemindersEnabled(on);
    updateSchedule((current) => ({ ...current, enabled: on }));
  };

  const addIntimation = () => {
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
    }));
  };

  const addReminder = () => {
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
    }));
  };

  return (
    <div className="space-y-6">
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <form onSubmit={(event) => void saveSettings(event)} className="space-y-6">
        <section className={`space-y-3 ${ui.cardPaddingLg}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-foreground">
                1. Sending
              </h2>
              <p className="text-sm text-foreground-muted">
                Turn on to send the emails configured below.
              </p>
            </div>
            <StatusPill tone={automationTone(automationStatus.kind)}>
              {automationStatus.label}
            </StatusPill>
          </div>

          <label className="flex max-w-md cursor-pointer items-center justify-between gap-4 rounded-2xl border border-border bg-surface-muted/40 px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              Send these emails automatically
            </span>
            <select
              aria-label="Send these emails automatically"
              value={isSending ? "on" : "off"}
              onChange={(event) => setSending(event.target.value === "on")}
              className={`${ui.select} w-28`}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>
        </section>

        <section className={`space-y-4 ${ui.cardPaddingLg}`}>
          <div className="space-y-1">
            <h2 className="text-lg font-medium text-foreground">
              2. Due day
            </h2>
            <p className="text-sm text-foreground-muted">
              Day of the month reports are due (1–28).
            </p>
          </div>

          <label className="block max-w-xs text-sm">
            <FieldLegend required>Due day</FieldLegend>
            <input
              type="number"
              min={1}
              max={28}
              value={schedule.dueDayOfMonth}
              onChange={(event) =>
                setDueDay(Number.parseInt(event.target.value, 10) || 1)
              }
              className={cn(
                ui.input,
                fieldErrors["schedule.dueDayOfMonth"] &&
                  "border-danger-border focus:ring-danger",
              )}
              aria-invalid={Boolean(fieldErrors["schedule.dueDayOfMonth"])}
            />
            {fieldErrors["schedule.dueDayOfMonth"] ? (
              <span className="mt-1 block text-xs text-danger">
                {fieldErrors["schedule.dueDayOfMonth"]}
              </span>
            ) : (
              <span className={`mt-1 block ${ui.hint}`}>
                Intimations use an earlier day; reminders use a later day.
              </span>
            )}
          </label>

          {dueClampNotice ? (
            <p className="rounded-2xl border border-warning-border bg-warning-muted/40 px-3 py-2 text-sm text-foreground">
              {dueClampNotice}
            </p>
          ) : null}

          <ScheduleSummary
            dueDay={due}
            intimations={schedule.intimations}
            reminders={schedule.reminders}
          />
        </section>

        <section className={`space-y-4 ${ui.cardPaddingLg}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-foreground">
                3. Before due — Intimations
              </h2>
              <p className="text-sm text-foreground-muted">
                Early notice emails (days 1–{Math.max(0, due - 1) || "—"}).{" "}
                <Link
                  href="/admin/email-templates"
                  className="underline hover:text-foreground"
                >
                  Email templates
                </Link>
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!intimationsAllowed}
              onClick={addIntimation}
            >
              Add intimation
            </Button>
          </div>

          {fieldErrors.intimations || fieldErrors["schedule.intimations"] ? (
            <p className="text-sm text-danger">
              {fieldErrors.intimations ?? fieldErrors["schedule.intimations"]}
            </p>
          ) : null}

          {schedule.intimations.length === 0 ? (
            <EmptyState
              title="No intimations yet"
              description={
                intimationsAllowed
                  ? "Optional. Add one to email people before the due day."
                  : "Set due day above the 1st to allow intimations."
              }
              action={
                intimationsAllowed ? (
                  <Button type="button" onClick={addIntimation}>
                    Add first intimation
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3">
              {schedule.intimations.map((step, index) => (
                <ScheduleStepCard
                  key={step.id}
                  index={index}
                  kindLabel="Intimation"
                  step={step}
                  dayOptions={intimationDays}
                  dayHint={`Before due day ${due}`}
                  templateOptions={templateOptions.intimations}
                  dayError={
                    fieldErrors[`schedule.intimations.${index}.dayOfMonth`]
                  }
                  templateError={
                    fieldErrors[`schedule.intimations.${index}.templateCode`]
                  }
                  audienceError={
                    fieldErrors[`schedule.intimations.${index}.audience`]
                  }
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
        </section>

        <section className={`space-y-4 ${ui.cardPaddingLg}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-medium text-foreground">
                4. After due — Reminders
              </h2>
              <p className="text-sm text-foreground-muted">
                Follow-up emails (days {due >= 28 ? "—" : `${due + 1}–28`}).
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!remindersAllowed}
              onClick={addReminder}
            >
              Add reminder
            </Button>
          </div>

          {fieldErrors.reminders || fieldErrors["schedule.reminders"] ? (
            <p className="text-sm text-danger">
              {fieldErrors.reminders ?? fieldErrors["schedule.reminders"]}
            </p>
          ) : null}

          {schedule.reminders.length === 0 ? (
            <EmptyState
              title="No reminders yet"
              description={
                remindersAllowed
                  ? "Optional. Add one to follow up after the due day."
                  : "Set due day below the 28th to allow reminders."
              }
              action={
                remindersAllowed ? (
                  <Button type="button" onClick={addReminder}>
                    Add first reminder
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-3">
              {schedule.reminders.map((step, index) => (
                <ScheduleStepCard
                  key={step.id}
                  index={index}
                  kindLabel="Reminder"
                  step={step}
                  dayOptions={reminderDays}
                  dayHint={`After due day ${due}`}
                  templateOptions={templateOptions.reminders}
                  dayError={
                    fieldErrors[`schedule.reminders.${index}.dayOfMonth`]
                  }
                  templateError={
                    fieldErrors[`schedule.reminders.${index}.templateCode`]
                  }
                  audienceError={
                    fieldErrors[`schedule.reminders.${index}.audience`]
                  }
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
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving || discarding}>
            {saving ? "Saving…" : "Save"}
          </Button>
          {isDirty ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void discardChanges()}
              disabled={saving || discarding}
            >
              {discarding ? "Discarding…" : "Discard"}
            </Button>
          ) : null}
          {isDirty ? (
            <p className="text-sm text-warning">Unsaved changes</p>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function ScheduleSummary({
  dueDay,
  intimations,
  reminders,
}: {
  dueDay: number;
  intimations: ScheduleStep[];
  reminders: ScheduleStep[];
}) {
  const before = sortIntimations(intimations);
  const after = sortReminders(reminders);

  if (before.length === 0 && after.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        Add intimations and reminders below to see the monthly order here.
      </p>
    );
  }

  const parts: string[] = [];
  for (const step of before) {
    parts.push(`day ${step.dayOfMonth} intimation`);
  }
  parts.push(`due day ${dueDay}`);
  for (const step of after) {
    parts.push(`day ${step.dayOfMonth} reminder`);
  }

  return (
    <p className="text-sm text-foreground-muted">
      <span className="font-medium text-foreground">This month: </span>
      {parts.join(" → ")}.
    </p>
  );
}

function ScheduleStepCard({
  index,
  kindLabel,
  step,
  dayOptions: days,
  dayHint,
  templateOptions,
  dayError,
  templateError,
  audienceError,
  onChange,
  onRemove,
}: {
  index: number;
  kindLabel: string;
  step: ScheduleStep;
  dayOptions: number[];
  dayHint: string;
  templateOptions: ScheduleTemplateOption[];
  dayError?: string;
  templateError?: string;
  audienceError?: string;
  onChange: (next: ScheduleStep) => void;
  onRemove: () => void;
}) {
  const options =
    days.includes(step.dayOfMonth) || days.length === 0
      ? days
      : [...days, step.dayOfMonth].sort((a, b) => a - b);

  return (
    <li className={`space-y-4 ${ui.cardPadding}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {kindLabel} #{index + 1}
        </h3>
        <Button type="button" variant="danger" onClick={onRemove}>
          Remove
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className={ui.label}>Day of month</span>
          <select
            value={step.dayOfMonth}
            onChange={(event) =>
              onChange({
                ...step,
                dayOfMonth: Number.parseInt(event.target.value, 10),
              })
            }
            className={cn(ui.select, dayError && "border-danger-border")}
            aria-invalid={Boolean(dayError)}
          >
            {options.map((day) => (
              <option key={day} value={day}>
                Day {day}
              </option>
            ))}
          </select>
          {dayError ? (
            <span className="mt-1 block text-xs text-danger">{dayError}</span>
          ) : (
            <span className={`mt-1 block ${ui.hint}`}>{dayHint}</span>
          )}
        </label>

        <label className="block text-sm">
          <span className={ui.label}>Email template</span>
          <select
            value={step.templateCode}
            onChange={(event) =>
              onChange({ ...step, templateCode: event.target.value })
            }
            className={cn(ui.select, templateError && "border-danger-border")}
            aria-invalid={Boolean(templateError)}
          >
            {!templateOptions.some(
              (option) => option.code === step.templateCode,
            ) ? (
              <option value={step.templateCode}>{step.templateCode}</option>
            ) : null}
            {templateOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.name}
              </option>
            ))}
          </select>
          {templateError ? (
            <span className="mt-1 block text-xs text-danger">
              {templateError}
            </span>
          ) : null}
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className={ui.label}>Audience</span>
          <select
            value={step.audience}
            onChange={(event) =>
              onChange({
                ...step,
                audience: event.target.value as ScheduleAudience,
              })
            }
            className={cn(
              ui.select,
              "max-w-md",
              audienceError && "border-danger-border",
            )}
            aria-invalid={Boolean(audienceError)}
          >
            {SCHEDULE_AUDIENCES.map((audience) => (
              <option key={audience} value={audience}>
                {audienceLabel(audience)}
              </option>
            ))}
          </select>
          {audienceError ? (
            <span className="mt-1 block text-xs text-danger">
              {audienceError}
            </span>
          ) : (
            <span className={`mt-1 block ${ui.hint}`}>
              {audienceHelperText(step.audience)}
            </span>
          )}
        </label>
      </div>
    </li>
  );
}
