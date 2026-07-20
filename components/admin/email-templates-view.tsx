"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import {
  categoryLabel,
  EMAIL_TEMPLATE_CATEGORIES,
  formatPlaceholderTokens,
  suggestTemplateCodeFromName,
  type EmailTemplateCategory,
  type EmailTemplateDetail,
  type EmailTemplateListItem,
  type EmailTemplateVersionItem,
  type EmailTemplatesPageData,
} from "@/lib/admin/email-templates.shared";
import { cn, ui } from "@/lib/ui/classes";

type WorkTab = "edit" | "preview" | "versions";
type TemplateCategoryFilter = "all" | EmailTemplateCategory;

type EditorFormState = {
  subject: string;
  body: string;
  changeNote: string;
};

type CreateFormState = {
  name: string;
  code: string;
  category: EmailTemplateCategory;
  subject: string;
  body: string;
};

const SAMPLE_PLACEHOLDERS: Record<string, string> = {
  period: "July 2026",
  name: "Jane",
  link: "https://example.com/set-password?token=…",
  expiryHours: "24",
};

const TEMPLATE_CATEGORY_FILTERS: Array<{
  value: TemplateCategoryFilter;
  label: string;
}> = [
  { value: "all", label: "All categories" },
  ...EMAIL_TEMPLATE_CATEGORIES.map((value) => ({
    value,
    label: categoryLabel(value),
  })),
];

const TEMPLATE_GROUP_ORDER = EMAIL_TEMPLATE_CATEGORIES;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toFormState(template: EmailTemplateDetail): EditorFormState {
  return {
    subject: template.subject,
    body: template.body,
    changeNote: "",
  };
}

function applySamplePlaceholders(text: string, placeholders: string[]): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (!placeholders.includes(key)) {
      return match;
    }
    return SAMPLE_PLACEHOLDERS[key] ?? match;
  });
}

function defaultCreateForm(): CreateFormState {
  return {
    name: "",
    code: "",
    category: "INTIMATION",
    subject: "",
    body: "",
  };
}

type EmailTemplatesViewProps = {
  initialData: EmailTemplatesPageData;
};

export function EmailTemplatesView({ initialData }: EmailTemplatesViewProps) {
  const [templates, setTemplates] = useState(initialData.templates);
  const [selectedCode, setSelectedCode] = useState(
    initialData.selected?.code ?? initialData.templates[0]?.code ?? "",
  );
  const [detail, setDetail] = useState<EmailTemplateDetail | null>(
    initialData.selected,
  );
  const [form, setForm] = useState<EditorFormState>(() =>
    initialData.selected
      ? toFormState(initialData.selected)
      : { subject: "", body: "", changeNote: "" },
  );
  const [tab, setTab] = useState<WorkTab>("edit");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategory, setTemplateCategory] =
    useState<TemplateCategoryFilter>("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(defaultCreateForm);
  const [revertingVersion, setRevertingVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] =
    useState<EmailTemplateVersionItem | null>(null);
  const [confirmRevertVersion, setConfirmRevertVersion] = useState<number | null>(
    null,
  );
  const [lastField, setLastField] = useState<"subject" | "body">("body");
  const lastFieldRef = useRef<"subject" | "body">("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = Boolean(
    detail &&
      (form.subject !== detail.subject ||
        form.body !== detail.body ||
        form.changeNote.trim() !== ""),
  );

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return templates.filter((template) => {
      if (
        templateCategory !== "all" &&
        template.category !== templateCategory
      ) {
        return false;
      }
      if (!query) {
        return true;
      }
      return (
        template.name.toLowerCase().includes(query) ||
        template.subject.toLowerCase().includes(query) ||
        template.code.toLowerCase().includes(query)
      );
    });
  }, [templates, templateSearch, templateCategory]);

  const groupedTemplates = useMemo(() => {
    if (templateCategory !== "all") {
      return filteredTemplates.length > 0
        ? ([[templateCategory, filteredTemplates]] as Array<
            [EmailTemplateCategory, EmailTemplateListItem[]]
          >)
        : [];
    }

    return TEMPLATE_GROUP_ORDER.flatMap((label) => {
      const items = filteredTemplates.filter(
        (template) => template.category === label,
      );
      return items.length > 0
        ? ([[label, items]] as Array<
            [EmailTemplateCategory, EmailTemplateListItem[]]
          >)
        : [];
    });
  }, [filteredTemplates, templateCategory]);

  const applyDetail = useCallback((next: EmailTemplateDetail) => {
    setDetail(next);
    setForm(toFormState(next));
    setSelectedCode(next.code);
    setTemplates((current) => {
      const exists = current.some((item) => item.code === next.code);
      if (!exists) {
        return [
          ...current,
          {
            code: next.code,
            name: next.name,
            category: next.category,
            subject: next.subject,
            currentVersion: next.currentVersion,
          },
        ].sort((a, b) => a.name.localeCompare(b.name));
      }
      return current.map((item) =>
        item.code === next.code
          ? {
              ...item,
              name: next.name,
              category: next.category,
              subject: next.subject,
              currentVersion: next.currentVersion,
            }
          : item,
      );
    });
  }, []);

  const loadTemplate = async (code: string) => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/email-templates/${encodeURIComponent(code)}`,
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load email template");
      }
      applyDetail(body.data as EmailTemplateDetail);
      setTab("edit");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load email template",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (code: string) => {
    if (code === selectedCode) {
      return;
    }
    if (isDirty) {
      const ok = window.confirm(
        "You have unsaved changes. Discard them and switch templates?",
      );
      if (!ok) {
        return;
      }
    }
    setSelectedCode(code);
    void loadTemplate(code);
  };

  const openCreateModal = () => {
    setCreateForm(defaultCreateForm());
    setCreateOpen(true);
    setError(null);
  };

  const createTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setCreating(true);

    const code =
      createForm.code.trim() || suggestTemplateCodeFromName(createForm.name);

    try {
      const response = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          code,
          category: createForm.category,
          subject: createForm.subject,
          body: createForm.body,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to create email template");
      }

      const created = body.data as EmailTemplateDetail;
      applyDetail(created);
      setCreateOpen(false);
      setCreateForm(defaultCreateForm());
      setTab("edit");
      setSuccess(`Created ${created.name}.`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Failed to create email template",
      );
    } finally {
      setCreating(false);
    }
  };

  const insertPlaceholder = (token: string) => {
    const snippet = `{{${token}}}`;
    const field = lastFieldRef.current;
    const target =
      field === "subject" ? subjectRef.current : bodyRef.current;
    if (!target) {
      setForm((current) => ({
        ...current,
        [field]: `${current[field]}${snippet}`,
      }));
      return;
    }

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const nextValue =
      target.value.slice(0, start) + snippet + target.value.slice(end);

    setForm((current) => ({ ...current, [field]: nextValue }));
    requestAnimationFrame(() => {
      target.focus();
      const cursor = start + snippet.length;
      target.setSelectionRange(cursor, cursor);
    });
  };

  const discardChanges = () => {
    if (!detail) {
      return;
    }
    setForm(toFormState(detail));
    setSuccess(null);
    setError(null);
  };

  const saveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedCode) {
      return;
    }

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/email-templates/${encodeURIComponent(selectedCode)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: form.subject,
            body: form.body,
            changeNote: form.changeNote.trim() === "" ? null : form.changeNote,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to save email template");
      }

      applyDetail(body.data as EmailTemplateDetail);
      setSuccess("Saved as a new version.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save email template",
      );
    } finally {
      setSaving(false);
    }
  };

  const revertToVersion = async (version: number) => {
    if (!selectedCode) {
      return;
    }

    setError(null);
    setSuccess(null);
    setRevertingVersion(version);
    setConfirmRevertVersion(null);
    setPreviewVersion(null);

    try {
      const response = await fetch(
        `/api/admin/email-templates/${encodeURIComponent(selectedCode)}/revert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Failed to restore email template");
      }

      applyDetail(body.data as EmailTemplateDetail);
      setTab("edit");
      setSuccess(`Restored version ${version} as the live version.`);
    } catch (revertError) {
      setError(
        revertError instanceof Error
          ? revertError.message
          : "Failed to restore email template",
      );
    } finally {
      setRevertingVersion(null);
    }
  };

  if (!detail) {
    return (
      <div className="space-y-4">
        {error ? <p className={ui.alertError}>{error}</p> : null}
        <p className={ui.alertWarning}>
          No email templates are available yet. Create one to get started.
        </p>
        <Button type="button" onClick={openCreateModal}>
          Create template
        </Button>
        <CreateTemplateModal
          open={createOpen}
          creating={creating}
          form={createForm}
          onClose={() => setCreateOpen(false)}
          onSubmit={(event) => void createTemplate(event)}
          onChange={setCreateForm}
        />
      </div>
    );
  }

  const busy = loading || saving || creating || revertingVersion !== null;
  const previewSubject = applySamplePlaceholders(form.subject, detail.placeholders);
  const previewBody = applySamplePlaceholders(form.body, detail.placeholders);

  return (
    <div className="space-y-4">
      {error ? <p className={ui.alertError}>{error}</p> : null}
      {success ? <p className={ui.alertSuccess}>{success}</p> : null}

      <div className="grid min-h-[32rem] gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className={cn(ui.card, "flex min-h-0 flex-col overflow-hidden")}>
          <div className="border-b border-border p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Templates</p>
                <p className="mt-0.5 text-xs text-foreground-subtle">
                  Select a template to edit or restore
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={openCreateModal}
                disabled={busy}
              >
                Create
              </Button>
            </div>
            <div className="mt-3 space-y-2">
              <input
                type="search"
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Search by name"
                className={ui.input}
                disabled={busy}
              />
              <select
                value={templateCategory}
                onChange={(event) =>
                  setTemplateCategory(
                    event.target.value as TemplateCategoryFilter,
                  )
                }
                className={ui.select}
                disabled={busy}
                aria-label="Filter by category"
              >
                {TEMPLATE_CATEGORY_FILTERS.map((category) => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            {groupedTemplates.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-foreground-subtle">
                No templates match your filters.
              </p>
            ) : (
              groupedTemplates.map(([group, items]) => (
                <div key={group} className="space-y-1">
                  {templateCategory === "all" ? (
                    <p className="px-2 text-[11px] font-semibold tracking-wider text-foreground-subtle uppercase">
                      {categoryLabel(group)}
                    </p>
                  ) : null}
                  {items.map((template) => {
                    const active = template.code === selectedCode;
                    return (
                      <button
                        key={template.code}
                        type="button"
                        onClick={() => handleSelect(template.code)}
                        disabled={busy && !active}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left transition-colors",
                          active
                            ? "bg-primary-muted text-primary"
                            : "text-foreground-muted hover:bg-surface-muted hover:text-foreground",
                          busy && !active && "opacity-60",
                        )}
                      >
                        <span className="min-w-0 truncate text-sm font-medium">
                          {template.name}
                        </span>
                        <span
                          className={cn(
                            "shrink-0 text-xs",
                            active ? "text-primary/80" : "text-foreground-subtle",
                          )}
                        >
                          v{template.currentVersion}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </aside>

        <section className={cn(ui.card, "flex min-h-0 flex-col overflow-hidden")}>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-foreground">
                  {detail.name}
                </h2>
                <StatusPill tone="info">Live v{detail.currentVersion}</StatusPill>
                {isDirty ? (
                  <StatusPill tone="warning">Unsaved changes</StatusPill>
                ) : null}
              </div>
              <p className="text-xs text-foreground-subtle">
                {categoryLabel(detail.category)}
              </p>
            </div>

            <div className="flex rounded-2xl border border-border bg-surface-muted/50 p-1">
              {(
                [
                  ["edit", "Edit"],
                  ["preview", "Preview"],
                  ["versions", "Versions"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                    tab === id
                      ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                      : "text-foreground-muted hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {loading ? (
              <p className="text-sm text-foreground-muted">Loading template…</p>
            ) : null}

            {!loading && tab === "edit" ? (
              <form
                onSubmit={(event) => void saveTemplate(event)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <p className={ui.label}>Placeholders</p>
                  <div className="flex flex-wrap gap-2">
                    {detail.placeholders.length === 0 ? (
                      <span className="text-sm text-foreground-subtle">
                        {formatPlaceholderTokens(detail.placeholders)}
                      </span>
                    ) : (
                      detail.placeholders.map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => insertPlaceholder(token)}
                          className="rounded-full border border-border bg-surface px-3 py-1 font-mono text-xs font-medium text-foreground-muted transition-colors hover:border-primary hover:bg-primary-muted hover:text-primary"
                          title={`Insert {{${token}}} into ${lastField}`}
                        >
                          {`{{${token}}}`}
                        </button>
                      ))
                    )}
                  </div>
                  <p className={ui.hint}>
                    Click a placeholder to insert it into the subject or body
                    (whichever you last focused).
                  </p>
                </div>

                <div className="space-y-1">
                  <FieldLabel htmlFor="templateSubject" required>
                    Subject
                  </FieldLabel>
                  <input
                    id="templateSubject"
                    ref={subjectRef}
                    value={form.subject}
                    onFocus={() => {
                      lastFieldRef.current = "subject";
                      setLastField("subject");
                    }}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                    className={ui.input}
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1">
                  <FieldLabel htmlFor="templateBody" required>
                    Body
                  </FieldLabel>
                  <textarea
                    id="templateBody"
                    ref={bodyRef}
                    rows={12}
                    value={form.body}
                    onFocus={() => {
                      lastFieldRef.current = "body";
                      setLastField("body");
                    }}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        body: event.target.value,
                      }))
                    }
                    className={cn(ui.input, "min-h-[14rem] py-3")}
                    disabled={busy}
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="changeNote" className={ui.label}>
                    Change note (optional)
                  </label>
                  <input
                    id="changeNote"
                    value={form.changeNote}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        changeNote: event.target.value,
                      }))
                    }
                    placeholder="Optional note for this version"
                    className={ui.input}
                    disabled={busy}
                  />
                </div>

                <div className="flex flex-wrap gap-3 pt-1">
                  <Button type="submit" disabled={busy || !isDirty}>
                    {saving ? "Saving…" : "Save as new version"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={discardChanges}
                    disabled={busy || !isDirty}
                  >
                    Discard
                  </Button>
                </div>
              </form>
            ) : null}

            {!loading && tab === "preview" ? (
              <div className="space-y-4">
                <p className="text-sm text-foreground-muted">
                  Preview with sample values
                  {detail.placeholders.includes("period")
                    ? ` ({{period}} → ${SAMPLE_PLACEHOLDERS.period})`
                    : null}
                  . This is what recipients will roughly see when the email is
                  sent.
                </p>
                <div className="overflow-hidden rounded-[24px] border border-border bg-surface-muted/40">
                  <div className="border-b border-border bg-surface px-5 py-3">
                    <p className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
                      Subject
                    </p>
                    <p className="mt-1 text-sm font-medium text-foreground">
                      {previewSubject || "(empty subject)"}
                    </p>
                  </div>
                  <div className="bg-surface px-5 py-5">
                    <p className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
                      Body
                    </p>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                      {previewBody || "(empty body)"}
                    </pre>
                  </div>
                </div>
                {isDirty ? (
                  <p className={ui.alertWarning}>
                    Showing unsaved edits. Save to publish a new live version.
                  </p>
                ) : null}
              </div>
            ) : null}

            {!loading && tab === "versions" ? (
              <div className="space-y-4">
                <p className="text-sm text-foreground-muted">
                  Each save creates a new version. Restoring falls back to an
                  older version and removes newer versions from history.
                </p>
                <ul className="space-y-3">
                  {detail.versions.map((version) => {
                    const isLive = version.version === detail.currentVersion;
                    return (
                      <li
                        key={version.version}
                        className="rounded-[24px] border border-border bg-surface px-4 py-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                v{version.version}
                              </span>
                              {isLive ? (
                                <StatusPill tone="success">Live</StatusPill>
                              ) : null}
                            </div>
                            <p className="truncate text-sm text-foreground-muted">
                              {version.subject}
                            </p>
                            <p className="text-xs text-foreground-subtle">
                              {formatDateTime(version.createdAt)}
                              {version.changeNote
                                ? ` · ${version.changeNote}`
                                : ""}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => setPreviewVersion(version)}
                              disabled={busy}
                            >
                              Preview
                            </Button>
                            {!isLive ? (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() =>
                                  setConfirmRevertVersion(version.version)
                                }
                                disabled={busy}
                              >
                                {revertingVersion === version.version
                                  ? "Restoring…"
                                  : "Restore"}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <Modal
        open={previewVersion !== null}
        title={
          previewVersion
            ? `Preview · v${previewVersion.version}`
            : "Preview"
        }
        onClose={() => setPreviewVersion(null)}
        wide
      >
        {previewVersion ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Saved {formatDateTime(previewVersion.createdAt)}
              {previewVersion.changeNote
                ? ` · ${previewVersion.changeNote}`
                : ""}
            </p>
            <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
              <p className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
                Subject
              </p>
              <p className="mt-1 text-sm font-medium">{previewVersion.subject}</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
              <p className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
                Body
              </p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {previewVersion.body}
              </pre>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPreviewVersion(null)}
              >
                Close
              </Button>
              {previewVersion.version !== detail.currentVersion ? (
                <Button
                  type="button"
                  onClick={() => {
                    setConfirmRevertVersion(previewVersion.version);
                  }}
                  disabled={busy}
                >
                  Restore this version
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmRevertVersion !== null}
        title="Restore version?"
        onClose={() => setConfirmRevertVersion(null)}
      >
        {confirmRevertVersion !== null ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Fall back to <strong>v{confirmRevertVersion}</strong> as the live
              version. Any newer versions (after v{confirmRevertVersion}) will
              be removed from history.
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmRevertVersion(null)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void revertToVersion(confirmRevertVersion)}
                disabled={busy}
              >
                {revertingVersion === confirmRevertVersion
                  ? "Restoring…"
                  : "Restore"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <CreateTemplateModal
        open={createOpen}
        creating={creating}
        form={createForm}
        onClose={() => setCreateOpen(false)}
        onSubmit={(event) => void createTemplate(event)}
        onChange={setCreateForm}
      />
    </div>
  );
}

function CreateTemplateModal({
  open,
  creating,
  form,
  onClose,
  onSubmit,
  onChange,
}: {
  open: boolean;
  creating: boolean;
  form: CreateFormState;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
  onChange: (next: CreateFormState) => void;
}) {
  return (
    <Modal open={open} title="Create template" onClose={onClose} className="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="create-template-name" required>
            Name
          </FieldLabel>
          <input
            id="create-template-name"
            className={ui.input}
            value={form.name}
            onChange={(event) => {
              const name = event.target.value;
              onChange({
                ...form,
                name,
                code: suggestTemplateCodeFromName(name),
              });
            }}
            required
            disabled={creating}
          />
        </div>

        <div>
          <FieldLabel htmlFor="create-template-category" required>
            Category
          </FieldLabel>
          <select
            id="create-template-category"
            className={ui.select}
            value={form.category}
            onChange={(event) =>
              onChange({
                ...form,
                category: event.target.value as EmailTemplateCategory,
              })
            }
            disabled={creating}
          >
            {EMAIL_TEMPLATE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <FieldLabel htmlFor="create-template-subject" required>
            Subject
          </FieldLabel>
          <input
            id="create-template-subject"
            className={ui.input}
            value={form.subject}
            onChange={(event) =>
              onChange({ ...form, subject: event.target.value })
            }
            required
            disabled={creating}
          />
        </div>

        <div>
          <FieldLabel htmlFor="create-template-body" required>
            Body
          </FieldLabel>
          <textarea
            id="create-template-body"
            className={cn(ui.input, "min-h-36 py-3")}
            value={form.body}
            onChange={(event) =>
              onChange({ ...form, body: event.target.value })
            }
            required
            disabled={creating}
          />
          <p className="mt-1 text-xs text-foreground-subtle">
            Intimation/Reminder templates typically use {"{{period}}"}. Password
            templates under Other use {"{{name}}"}, {"{{link}}"}, and{" "}
            {"{{expiryHours}}"}.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={creating}>
            {creating ? "Creating…" : "Create template"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
