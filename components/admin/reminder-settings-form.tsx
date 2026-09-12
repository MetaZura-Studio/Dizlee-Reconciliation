/**
 * Admin Reminder Settings form — guided monthly schedule for automatic intimations/reminders.
 * UI redesign only: same save/API/validation/schedule rules; compact list + edit modal.
 */

"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FieldLabel } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
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
import { formatAppError } from "@/lib/errors/format";
import { cn, ui } from "@/lib/ui/classes";

type ReminderSettingsFormProps = {
  initialSettings: ReminderSettingsView;
};

type FieldErrors = Record<string, string>;

type StepKind = "INTIMATION" | "REMINDER";

type StepEditorState =
  | { mode: "create"; kind: StepKind; draft: ScheduleStep }
  | { mode: "edit"; kind: StepKind; draft: ScheduleStep };

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

function ordinalDay(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function relativeToDue(
  dayOfMonth: number,
  dueDay: number,
  kind: StepKind,
): string {
  if (kind === "INTIMATION") {
    const daysBefore = dueDay - dayOfMonth;
    if (daysBefore <= 0) {
      return `Day ${dayOfMonth} of the month`;
    }
    if (daysBefore === 1) {
      return "1 day before the due date";
    }
    return `${daysBefore} days before the due date`;
  }

  const daysAfter = dayOfMonth - dueDay;
  if (daysAfter <= 0) {
    return `Day ${dayOfMonth} of the month`;
  }
  if (daysAfter === 1) {
    return "1 day after the due date";
  }
  return `${daysAfter} days after the due date`;
}

function templateName(
  code: string,
  options: ScheduleTemplateOption[],
): string {
  return options.find((option) => option.code === code)?.name ?? code;
}

function createDefaultStep(
  kind: StepKind,
  dueDayOfMonth: number,
  templateOptions: ReminderSettingsView["templateOptions"],
): ScheduleStep {
  if (kind === "INTIMATION") {
    return {
      id: newStepId("intimation"),
      dayOfMonth: defaultIntimationDay(dueDayOfMonth),
      templateCode: defaultTemplateCode(
        templateOptions.intimations,
        defaultTemplateForKind("INTIMATION"),
      ),
      audience: "both",
    };
  }

  return {
    id: newStepId("reminder"),
    dayOfMonth: defaultReminderDay(dueDayOfMonth),
    templateCode: defaultTemplateCode(
      templateOptions.reminders,
      defaultTemplateForKind("REMINDER"),
    ),
    audience: "both",
  };
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
  const [stepEditor, setStepEditor] = useState<StepEditorState | null>(null);
  const [stepEditorError, setStepEditorError] = useState<string | null>(null);

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
        throw new Error(formatAppError(body, "Failed to reload reminder settings"));
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
        throw new Error(formatAppError(body, "Failed to save reminder settings"));
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

  const openCreateStep = (kind: StepKind) => {
    if (kind === "INTIMATION" && !intimationsAllowed) {
      return;
    }
    if (kind === "REMINDER" && !remindersAllowed) {
      return;
    }
    setStepEditorError(null);
    setStepEditor({
      mode: "create",
      kind,
      draft: createDefaultStep(kind, due, templateOptions),
    });
  };

  const openEditStep = (kind: StepKind, step: ScheduleStep) => {
    setStepEditorError(null);
    setStepEditor({
      mode: "edit",
      kind,
      draft: { ...step },
    });
  };

  const closeStepEditor = () => {
    setStepEditor(null);
    setStepEditorError(null);
  };

  const commitStepEditor = () => {
    if (!stepEditor) {
      return;
    }

    const { kind, draft, mode } = stepEditor;
    const allowedDays =
      kind === "INTIMATION" ? intimationDays : reminderDays;

    if (allowedDays.length === 0 || !allowedDays.includes(draft.dayOfMonth)) {
      setStepEditorError(
        kind === "INTIMATION"
          ? "Choose a day before the report due date."
          : "Choose a day after the report due date.",
      );
      return;
    }

    if (!draft.templateCode.trim()) {
      setStepEditorError("Choose an email template.");
      return;
    }

    setStepEditorError(null);

    if (kind === "INTIMATION") {
      updateSchedule((current) => {
        const next =
          mode === "create"
            ? [...current.intimations, draft]
            : current.intimations.map((item) =>
                item.id === draft.id ? draft : item,
              );
        return { ...current, intimations: sortIntimations(next) };
      });
    } else {
      updateSchedule((current) => {
        const next =
          mode === "create"
            ? [...current.reminders, draft]
            : current.reminders.map((item) =>
                item.id === draft.id ? draft : item,
              );
        return { ...current, reminders: sortReminders(next) };
      });
    }

    closeStepEditor();
  };

  const removeIntimation = (id: string) => {
    updateSchedule((current) => ({
      ...current,
      intimations: current.intimations.filter((item) => item.id !== id),
    }));
  };

  const removeReminder = (id: string) => {
    updateSchedule((current) => ({
      ...current,
      reminders: current.reminders.filter((item) => item.id !== id),
    }));
  };

  const editorDayOptions =
    stepEditor?.kind === "INTIMATION" ? intimationDays : reminderDays;
  const editorTemplateOptions =
    stepEditor?.kind === "INTIMATION"
      ? templateOptions.intimations
      : templateOptions.reminders;

  return (
    <div className="space-y-5">
      {error ? <p className={ui.alertError}>{error}</p> : null}

      <form onSubmit={(event) => void saveSettings(event)} className="space-y-5">
        {/* Sending */}
        <section className={cn(ui.card, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Automatic emails
              </h2>
              <p className="text-sm text-foreground-muted">
                When on, the schedule below runs each month for report
                submission notices.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill tone={automationTone(automationStatus.kind)}>
                {automationStatus.label}
              </StatusPill>
              <label className="flex items-center gap-2 text-sm">
                <span className="text-foreground-muted">Sending</span>
                <select
                  aria-label="Send these emails automatically"
                  value={isSending ? "on" : "off"}
                  onChange={(event) => setSending(event.target.value === "on")}
                  className={cn(ui.select, "w-24")}
                >
                  <option value="off">Off</option>
                  <option value="on">On</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        {/* Workflow summary */}
        <WorkflowSummary
          dueDay={due}
          intimations={schedule.intimations}
          reminders={schedule.reminders}
          templateOptions={templateOptions}
        />

        {/* Due day */}
        <section className={cn(ui.card, "p-5 sm:p-6")}>
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-foreground">
              Report due day
            </h2>
            <p className="text-sm text-foreground-muted">
              The day each month when reports are expected.
            </p>
          </div>

          <div className="mt-4 max-w-md space-y-2">
            <label className="block text-sm">
              <FieldLabel htmlFor="due-day" required>
                Day of month
              </FieldLabel>
              <input
                id="due-day"
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
                <span className={cn("mt-1 block", ui.hint)}>Between 1 and 28</span>
              )}
            </label>
            <p className="text-sm text-foreground">
              Reports are due on the{" "}
              <span className="font-semibold">{ordinalDay(due)}</span> day of
              every month.
            </p>
          </div>

          {dueClampNotice ? (
            <p className="mt-3 rounded-2xl border border-warning-border bg-warning-muted/40 px-3 py-2 text-sm text-foreground">
              {dueClampNotice}
            </p>
          ) : null}
        </section>

        {/* Intimations */}
        <section className={cn(ui.card, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                Before due — Intimations
              </h2>
              <p className="text-sm text-foreground-muted">
                Notices sent before the report due date.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!intimationsAllowed}
              onClick={() => openCreateStep("INTIMATION")}
            >
              Add intimation
            </Button>
          </div>

          {fieldErrors.intimations || fieldErrors["schedule.intimations"] ? (
            <p className="mt-3 text-sm text-danger">
              {fieldErrors.intimations ?? fieldErrors["schedule.intimations"]}
            </p>
          ) : null}

          <div className="mt-4">
            {schedule.intimations.length === 0 ? (
              <EmptyState
                title="No intimations yet"
                description={
                  intimationsAllowed
                    ? "Optional. Add a notice that goes out before the due date."
                    : "Set the due day above the 1st to allow intimations."
                }
                action={
                  intimationsAllowed ? (
                    <Button
                      type="button"
                      onClick={() => openCreateStep("INTIMATION")}
                    >
                      Add first intimation
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {schedule.intimations.map((step, index) => (
                  <CompactStepRow
                    key={step.id}
                    kind="INTIMATION"
                    dueDay={due}
                    step={step}
                    templateLabel={templateName(
                      step.templateCode,
                      templateOptions.intimations,
                    )}
                    dayError={
                      fieldErrors[`schedule.intimations.${index}.dayOfMonth`]
                    }
                    templateError={
                      fieldErrors[`schedule.intimations.${index}.templateCode`]
                    }
                    audienceError={
                      fieldErrors[`schedule.intimations.${index}.audience`]
                    }
                    onEdit={() => openEditStep("INTIMATION", step)}
                    onDelete={() => removeIntimation(step.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Reminders */}
        <section className={cn(ui.card, "p-5 sm:p-6")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="text-base font-semibold text-foreground">
                After due — Reminders
              </h2>
              <p className="text-sm text-foreground-muted">
                Follow-ups sent after the report due date.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              disabled={!remindersAllowed}
              onClick={() => openCreateStep("REMINDER")}
            >
              Add reminder
            </Button>
          </div>

          {fieldErrors.reminders || fieldErrors["schedule.reminders"] ? (
            <p className="mt-3 text-sm text-danger">
              {fieldErrors.reminders ?? fieldErrors["schedule.reminders"]}
            </p>
          ) : null}

          <div className="mt-4">
            {schedule.reminders.length === 0 ? (
              <EmptyState
                title="No reminders yet"
                description={
                  remindersAllowed
                    ? "Optional. Add a follow-up that goes out after the due date."
                    : "Set the due day below the 28th to allow reminders."
                }
                action={
                  remindersAllowed ? (
                    <Button
                      type="button"
                      onClick={() => openCreateStep("REMINDER")}
                    >
                      Add first reminder
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border">
                {schedule.reminders.map((step, index) => (
                  <CompactStepRow
                    key={step.id}
                    kind="REMINDER"
                    dueDay={due}
                    step={step}
                    templateLabel={templateName(
                      step.templateCode,
                      templateOptions.reminders,
                    )}
                    dayError={
                      fieldErrors[`schedule.reminders.${index}.dayOfMonth`]
                    }
                    templateError={
                      fieldErrors[`schedule.reminders.${index}.templateCode`]
                    }
                    audienceError={
                      fieldErrors[`schedule.reminders.${index}.audience`]
                    }
                    onEdit={() => openEditStep("REMINDER", step)}
                    onDelete={() => removeReminder(step.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <Link
            href="/admin/email-templates"
            className="text-sm text-foreground-subtle underline-offset-2 hover:text-foreground-muted hover:underline"
          >
            Manage email templates
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            {isDirty ? (
              <p className="text-sm font-medium text-warning">
                Unsaved changes
              </p>
            ) : null}
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
            <Button type="submit" disabled={saving || discarding}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </form>

      <Modal
        open={stepEditor !== null}
        title={
          stepEditor
            ? stepEditor.mode === "create"
              ? stepEditor.kind === "INTIMATION"
                ? "Add intimation"
                : "Add reminder"
              : stepEditor.kind === "INTIMATION"
                ? "Edit intimation"
                : "Edit reminder"
            : "Edit step"
        }
        onClose={closeStepEditor}
      >
        {stepEditor ? (
          <div className="space-y-4">
            {stepEditorError ? (
              <p className={ui.alertError}>{stepEditorError}</p>
            ) : null}

            <label className="block text-sm">
              <FieldLabel required>When to send</FieldLabel>
              <select
                value={stepEditor.draft.dayOfMonth}
                onChange={(event) =>
                  setStepEditor({
                    ...stepEditor,
                    draft: {
                      ...stepEditor.draft,
                      dayOfMonth: Number.parseInt(event.target.value, 10),
                    },
                  })
                }
                className={ui.select}
              >
                {(editorDayOptions.includes(stepEditor.draft.dayOfMonth) ||
                editorDayOptions.length === 0
                  ? editorDayOptions
                  : [...editorDayOptions, stepEditor.draft.dayOfMonth].sort(
                      (a, b) => a - b,
                    )
                ).map((day) => (
                  <option key={day} value={day}>
                    {ordinalDay(day)} of the month —{" "}
                    {relativeToDue(day, due, stepEditor.kind)}
                  </option>
                ))}
              </select>
              <span className={cn("mt-1 block", ui.hint)}>
                {stepEditor.kind === "INTIMATION"
                  ? `Must be before the ${ordinalDay(due)} (due date).`
                  : `Must be after the ${ordinalDay(due)} (due date).`}
              </span>
            </label>

            <label className="block text-sm">
              <FieldLabel required>Email template</FieldLabel>
              <select
                value={stepEditor.draft.templateCode}
                onChange={(event) =>
                  setStepEditor({
                    ...stepEditor,
                    draft: {
                      ...stepEditor.draft,
                      templateCode: event.target.value,
                    },
                  })
                }
                className={ui.select}
              >
                {!editorTemplateOptions.some(
                  (option) => option.code === stepEditor.draft.templateCode,
                ) ? (
                  <option value={stepEditor.draft.templateCode}>
                    {stepEditor.draft.templateCode}
                  </option>
                ) : null}
                {editorTemplateOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <FieldLabel required>Audience</FieldLabel>
              <select
                value={stepEditor.draft.audience}
                onChange={(event) =>
                  setStepEditor({
                    ...stepEditor,
                    draft: {
                      ...stepEditor.draft,
                      audience: event.target.value as ScheduleAudience,
                    },
                  })
                }
                className={ui.select}
              >
                {SCHEDULE_AUDIENCES.map((audience) => (
                  <option key={audience} value={audience}>
                    {audienceLabel(audience)}
                  </option>
                ))}
              </select>
              <span className={cn("mt-1 block", ui.hint)}>
                {audienceHelperText(stepEditor.draft.audience)}
              </span>
            </label>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={closeStepEditor}
              >
                Cancel
              </Button>
              <Button type="button" onClick={commitStepEditor}>
                {stepEditor.mode === "create" ? "Add" : "Save"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function WorkflowSummary({
  dueDay,
  intimations,
  reminders,
  templateOptions,
}: {
  dueDay: number;
  intimations: ScheduleStep[];
  reminders: ScheduleStep[];
  templateOptions: ReminderSettingsView["templateOptions"];
}) {
  const before = sortIntimations(intimations);
  const after = sortReminders(reminders);

  const nodes: Array<{
    key: string;
    title: string;
    detail: string;
    accent: "notice" | "due" | "reminder";
  }> = [];

  for (const step of before) {
    nodes.push({
      key: `i-${step.id}`,
      title: "Intimation",
      detail: `${relativeToDue(step.dayOfMonth, dueDay, "INTIMATION")} · ${audienceLabel(step.audience)} · ${templateName(step.templateCode, templateOptions.intimations)}`,
      accent: "notice",
    });
  }

  nodes.push({
    key: "due",
    title: "Report due",
    detail: `${ordinalDay(dueDay)} of every month`,
    accent: "due",
  });

  for (const step of after) {
    nodes.push({
      key: `r-${step.id}`,
      title: "Reminder",
      detail: `${relativeToDue(step.dayOfMonth, dueDay, "REMINDER")} · ${audienceLabel(step.audience)} · ${templateName(step.templateCode, templateOptions.reminders)}`,
      accent: "reminder",
    });
  }

  return (
    <section className={cn(ui.card, "p-5 sm:p-6")}>
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground">
          Monthly schedule
        </h2>
        <p className="text-sm text-foreground-muted">
          What happens in a typical month, in order.
        </p>
      </div>

      {before.length === 0 && after.length === 0 ? (
        <p className="mt-4 text-sm text-foreground-muted">
          Add intimations or reminders below to see the full monthly flow.
          Report due day is currently the {ordinalDay(dueDay)}.
        </p>
      ) : (
        <ol className="mt-4 space-y-0">
          {nodes.map((node, index) => (
            <li key={node.key} className="flex gap-3">
              <div className="flex w-6 shrink-0 flex-col items-center">
                <span
                  className={cn(
                    "mt-1.5 h-2.5 w-2.5 rounded-full",
                    node.accent === "due" ? "bg-primary" : "bg-foreground-subtle",
                  )}
                />
                {index < nodes.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-border" aria-hidden />
                ) : null}
              </div>
              <div
                className={cn(
                  "mb-3 min-w-0 flex-1 rounded-2xl border px-3.5 py-3",
                  node.accent === "due"
                    ? "border-primary/30 bg-primary-muted/40"
                    : "border-border bg-surface",
                )}
              >
                <p className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
                  {node.title}
                </p>
                <p className="mt-1 text-sm text-foreground">{node.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function CompactStepRow({
  kind,
  dueDay,
  step,
  templateLabel,
  dayError,
  templateError,
  audienceError,
  onEdit,
  onDelete,
}: {
  kind: StepKind;
  dueDay: number;
  step: ScheduleStep;
  templateLabel: string;
  dayError?: string;
  templateError?: string;
  audienceError?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rowError = dayError || templateError || audienceError;

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-foreground">
          {relativeToDue(step.dayOfMonth, dueDay, kind)}
          <span className="font-normal text-foreground-muted">
            {" "}
            · {ordinalDay(step.dayOfMonth)} of the month
          </span>
        </p>
        <p className="text-sm text-foreground-muted">
          {templateLabel}
          <span className="text-foreground-subtle">
            {" "}
            · {audienceLabel(step.audience)}
          </span>
        </p>
        {rowError ? (
          <p className="text-xs text-danger">{rowError}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="secondary" onClick={onEdit}>
          Edit
        </Button>
        <Button type="button" variant="ghost" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </li>
  );
}
