/**
 * Edit notification and auth email templates stored in the database.
 * Supports preview, versioning, and creation of new template codes.
 * UI-only redesign: two-column list + editor; APIs unchanged.
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { IconEye, IconPlus } from "@/components/ui/icons";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  EMAIL_TEMPLATE_CATEGORIES,
  categoryLabel,
  getPlaceholdersForTemplate,
  suggestTemplateCodeFromName,
  type EmailTemplateCategory,
  type EmailTemplateDetail,
  type EmailTemplateVersionItem,
  type EmailTemplatesPageData,
} from "@/lib/admin/email-templates.shared";
import { formatAppError } from "@/lib/errors/format";
import { formatAppDateTime } from "@/lib/platform/format-datetime";
import { cn, ui } from "@/lib/ui/classes";

type EditorFormState = {
  name: string;
  subject: string;
  body: string;
};

type CreateFormState = {
  name: string;
  code: string;
  category: EmailTemplateCategory;
  subject: string;
  body: string;
};

/** Realistic sample values for preview (not raw {{tokens}}). */
const SAMPLE_PLACEHOLDERS: Record<string, string> = {
  period: "August 2026",
  name: "Jane",
  link: "https://reconciliation.example.com/set-password?token=…",
  expiryHours: "1",
  opcoName: "Zain KSA",
  partnerName: "Partner ABC",
  status: "Completed",
  matchedCount: "42",
  unmatchedCount: "3",
  totalVariance: "SAR 1,250.00",
  tolerancePercent: "2.5",
  outcome: "3 mismatched / unmatched line item(s)",
};

const PLACEHOLDER_LABELS: Record<string, string> = {
  period: "Period",
  name: "Name",
  link: "Link",
  expiryHours: "Expiry hours",
  opcoName: "OpCo Name",
  partnerName: "Partner Name",
  status: "Status",
  matchedCount: "Matched Count",
  unmatchedCount: "Unmatched Count",
  totalVariance: "Total Variance",
  tolerancePercent: "Tolerance",
  outcome: "Outcome",
};

function placeholderLabel(token: string): string {
  return PLACEHOLDER_LABELS[token] ?? token;
}

function toFormState(template: EmailTemplateDetail): EditorFormState {
  return {
    name: template.name,
    subject: template.subject,
    body: template.body,
  };
}

function emptyEditorForm(): EditorFormState {
  return { name: "", subject: "", body: "" };
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
      : emptyEditorForm(),
  );
  const [templateSearch, setTemplateSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<
    "ALL" | EmailTemplateCategory
  >("ALL");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(defaultCreateForm);
  const [revertingVersion, setRevertingVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveChangeNote, setSaveChangeNote] = useState("");
  const [previewVersion, setPreviewVersion] =
    useState<EmailTemplateVersionItem | null>(null);
  const [confirmRevertVersion, setConfirmRevertVersion] = useState<number | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [insertOpen, setInsertOpen] = useState(false);
  const [lastField, setLastField] = useState<"subject" | "body">("body");
  const lastFieldRef = useRef<"subject" | "body">("body");
  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const insertRef = useRef<HTMLDivElement>(null);

  const isDirty = Boolean(
    detail &&
      (form.name !== detail.name ||
        form.subject !== detail.subject ||
        form.body !== detail.body),
  );

  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return templates.filter((template) => {
      if (categoryFilter !== "ALL" && template.category !== categoryFilter) {
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
  }, [templates, templateSearch, categoryFilter]);

  useEffect(() => {
    if (!insertOpen) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (insertRef.current && !insertRef.current.contains(target)) {
        setInsertOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [insertOpen]);

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
    setLoading(true);

    try {
      const response = await fetch(
        `/api/admin/email-templates/${encodeURIComponent(code)}`,
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to load email template"));
      }
      applyDetail(body.data as EmailTemplateDetail);
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
    setInsertOpen(false);
    void loadTemplate(code);
  };

  const openCreateModal = () => {
    setCreateForm(defaultCreateForm());
    setCreateOpen(true);
    setError(null);
  };

  const createTemplate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
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
        throw new Error(formatAppError(body, "Failed to create email template"));
      }

      const created = body.data as EmailTemplateDetail;
      applyDetail(created);
      setCreateOpen(false);
      setCreateForm(defaultCreateForm());
      toast.success(`Created ${created.name}.`);
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
      setInsertOpen(false);
      return;
    }

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const nextValue =
      target.value.slice(0, start) + snippet + target.value.slice(end);

    setForm((current) => ({ ...current, [field]: nextValue }));
    setInsertOpen(false);
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
    setError(null);
  };

  const openSaveModal = () => {
    if (!isDirty) {
      return;
    }
    setSaveChangeNote("");
    setSaveOpen(true);
  };

  const saveTemplate = async () => {
    if (!selectedCode) {
      return;
    }

    setError(null);
    setSaving(true);

    try {
      const response = await fetch(
        `/api/admin/email-templates/${encodeURIComponent(selectedCode)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            subject: form.subject,
            body: form.body,
            changeNote:
              saveChangeNote.trim() === "" ? null : saveChangeNote.trim(),
          }),
        },
      );
      const body = await response.json();
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to save email template"));
      }

      applyDetail(body.data as EmailTemplateDetail);
      setSaveOpen(false);
      setSaveChangeNote("");
      toast.success("Saved as a new version.");
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
        throw new Error(formatAppError(body, "Failed to restore email template"));
      }

      applyDetail(body.data as EmailTemplateDetail);
      setVersionsOpen(false);
      toast.success(`Restored version ${version} as the live version.`);
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

  const deleteTemplate = async () => {
    if (!selectedCode || !detail) {
      return;
    }

    setError(null);
    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/email-templates/${encodeURIComponent(selectedCode)}`,
        { method: "DELETE" },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(formatAppError(body, "Failed to delete email template"));
      }

      const remaining = templates.filter(
        (template) => template.code !== selectedCode,
      );
      setTemplates(remaining);
      setDeleteOpen(false);
      toast.success(`Deleted template “${detail.name}”.`);

      const nextCode = remaining[0]?.code ?? "";
      setSelectedCode(nextCode);
      if (nextCode) {
        await loadTemplate(nextCode);
      } else {
        setDetail(null);
        setForm(emptyEditorForm());
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete email template",
      );
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const busy =
    loading || saving || creating || deleting || revertingVersion !== null;
  const previewSubject = detail
    ? applySamplePlaceholders(form.subject, detail.placeholders)
    : "";
  const previewBody = detail
    ? applySamplePlaceholders(form.body, detail.placeholders)
    : "";

  if (!detail) {
    return (
      <div className="space-y-4">
        <EmailTemplatesPageHeader
          busy={busy}
          onCreate={openCreateModal}
        />
        {error ? <p className={ui.alertError}>{error}</p> : null}
        <p className={ui.alertWarning}>
          No email templates are available yet. Create one to get started.
        </p>
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

  return (
    <div className="-mb-4 flex h-[calc(100dvh-5.5rem)] flex-col gap-2 sm:-mb-5 sm:h-[calc(100dvh-6.25rem)] sm:gap-3 lg:-mb-6 lg:h-[calc(100dvh-7rem)]">
      <EmailTemplatesPageHeader busy={busy} onCreate={openCreateModal} />

      {error ? <p className={cn(ui.alertError, "shrink-0")}>{error}</p> : null}

      {/* Mobile template picker */}
      <div className="shrink-0 space-y-2 lg:hidden">
        <label className="block text-sm">
          <span className={ui.label}>Category</span>
          <select
            className={ui.select}
            value={categoryFilter}
            disabled={busy}
            onChange={(event) =>
              setCategoryFilter(
                event.target.value as "ALL" | EmailTemplateCategory,
              )
            }
          >
            <option value="ALL">All categories</option>
            {EMAIL_TEMPLATE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {categoryLabel(category)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className={ui.label}>Template</span>
          <select
            className={ui.select}
            value={selectedCode}
            disabled={busy}
            onChange={(event) => handleSelect(event.target.value)}
          >
            {filteredTemplates.map((template) => (
              <option key={template.code} value={template.code}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[17.5rem_minmax(0,1fr)] xl:grid-cols-[18.5rem_minmax(0,1fr)]">
        <aside
          className={cn(
            ui.card,
            "hidden min-h-0 flex-col overflow-hidden pb-3 lg:flex",
          )}
        >
          <div className="border-b border-border p-4">
            <p className="text-sm font-semibold text-foreground">
              Email templates
            </p>
            <input
              type="search"
              value={templateSearch}
              onChange={(event) => setTemplateSearch(event.target.value)}
              placeholder="Search templates"
              className={cn(ui.input, "mt-3")}
              disabled={busy}
            />
            <select
              aria-label="Filter by category"
              className={cn(ui.select, "mt-2")}
              value={categoryFilter}
              disabled={busy}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value as "ALL" | EmailTemplateCategory,
                )
              }
            >
              <option value="ALL">All categories</option>
              {EMAIL_TEMPLATE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </div>

          <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-2">
            {filteredTemplates.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-foreground-subtle">
                No templates match your filters.
              </p>
            ) : (
              filteredTemplates.map((template) => {
                const active = template.code === selectedCode;
                return (
                  <button
                    key={template.code}
                    type="button"
                    onClick={() => handleSelect(template.code)}
                    disabled={busy && !active}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                      active
                        ? "bg-primary-muted text-primary"
                        : "text-foreground hover:bg-surface-muted",
                      busy && !active && "opacity-60",
                    )}
                  >
                    <span className="truncate text-sm font-medium">
                      {template.name}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        active ? "text-primary/80" : "text-foreground-subtle",
                      )}
                    >
                      {categoryLabel(template.category)} · v
                      {template.currentVersion}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section
          className={cn(ui.card, "flex min-h-0 flex-col overflow-hidden")}
        >
          <div className="space-y-2 border-b border-border px-5 py-4">
            <div className="max-w-xl space-y-1">
              <FieldLabel htmlFor="templateName" required>
                Template name
              </FieldLabel>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="templateName"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={cn(ui.input, "min-w-0 max-w-xl flex-1")}
                disabled={busy}
                required
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 gap-2"
                  onClick={() => setPreviewOpen(true)}
                  disabled={loading}
                >
                  <IconEye className="h-4 w-4" />
                  Preview
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10"
                  onClick={() => setVersionsOpen(true)}
                  disabled={busy}
                >
                  Version history
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  className="h-10"
                  onClick={() => {
                    setError(null);
                    setDeleteOpen(true);
                  }}
                  disabled={busy}
                >
                  Delete
                </Button>
              </div>
            </div>
            <p className="text-xs text-foreground-muted">
              {categoryLabel(detail.category)} · Active · v
              {detail.currentVersion}
              {isDirty ? " · Unsaved changes" : ""}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {loading ? (
              <p className="p-5 text-sm text-foreground-muted">
                Loading template…
              </p>
            ) : (
              <>
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-5 pb-4">
                  <div className="shrink-0 space-y-1">
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

                  <div className="flex min-h-0 flex-1 flex-col gap-1">
                    <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
                      <FieldLabel htmlFor="templateBody" required>
                        Email body
                      </FieldLabel>
                      <div className="relative" ref={insertRef}>
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 gap-1.5 px-3 text-xs"
                          disabled={busy || detail.placeholders.length === 0}
                          onClick={() => setInsertOpen((open) => !open)}
                        >
                          <IconPlus className="h-3.5 w-3.5" />
                          Insert variable
                        </Button>
                        {insertOpen ? (
                          <div
                            className={cn(
                              ui.dropdown,
                              "right-0 max-h-64 w-56 overflow-y-auto py-1",
                            )}
                          >
                            <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-foreground-subtle uppercase">
                              Insert into {lastField}
                            </p>
                            {detail.placeholders.map((token) => (
                              <button
                                key={token}
                                type="button"
                                className="flex w-full flex-col px-3 py-2 text-left hover:bg-surface-muted"
                                onClick={() => insertPlaceholder(token)}
                              >
                                <span className="text-sm text-foreground">
                                  {placeholderLabel(token)}
                                </span>
                                <span className="font-mono text-[11px] text-foreground-subtle">
                                  {`{{${token}}}`}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="relative min-h-0 flex-1">
                      <textarea
                        id="templateBody"
                        ref={bodyRef}
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
                        className={cn(
                          ui.input,
                          "absolute inset-0 h-full min-h-0 resize-none overflow-y-auto py-3",
                        )}
                        disabled={busy}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-border px-5 py-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={discardChanges}
                    disabled={busy || !isDirty}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={openSaveModal}
                    disabled={busy || !isDirty}
                  >
                    Save changes
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {/* Live preview */}
      <Modal
        open={previewOpen}
        title="Email preview"
        onClose={() => setPreviewOpen(false)}
        wide
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Sample data is filled in so you can see what a recipient will read.
          </p>
          <div className="overflow-hidden rounded-[22px] border border-border bg-canvas shadow-[var(--shadow-sm)]">
            <div className="border-b border-border bg-surface px-5 py-4">
              <p className="text-xs text-foreground-subtle">Subject</p>
              <p className="mt-1 text-base font-semibold text-foreground">
                {previewSubject || "(empty subject)"}
              </p>
            </div>
            <div className="bg-surface px-5 py-6">
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {previewBody || "(empty body)"}
              </pre>
            </div>
          </div>
          {isDirty ? (
            <p className={ui.alertWarning}>
              Showing unsaved edits. Save changes to publish a new version.
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPreviewOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Save with optional change note */}
      <Modal
        open={saveOpen}
        title="Save new version"
        onClose={() => (saving ? null : setSaveOpen(false))}
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Saving creates a new version of this template. You can add an
            optional note for your team.
          </p>
          <div className="space-y-1">
            <label htmlFor="save-change-note" className={ui.label}>
              Change note (optional)
            </label>
            <input
              id="save-change-note"
              value={saveChangeNote}
              onChange={(event) => setSaveChangeNote(event.target.value)}
              placeholder="e.g. Updated reminder wording"
              className={ui.input}
              disabled={saving}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSaveOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void saveTemplate()}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Version history */}
      <Modal
        open={versionsOpen}
        title="Version history"
        onClose={() => setVersionsOpen(false)}
        wide
      >
        <div className="space-y-4">
          <p className="text-sm text-foreground-muted">
            Each save creates a new version. Restoring makes an older version
            live and removes newer versions from history.
          </p>
          <ul className="max-h-[28rem] space-y-3 overflow-y-auto">
            {detail.versions.map((version) => {
              const isLive = version.version === detail.currentVersion;
              return (
                <li
                  key={version.version}
                  className="rounded-2xl border border-border bg-surface px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-semibold text-foreground">
                        v{version.version}
                        {isLive ? " · Live" : ""}
                      </p>
                      <p className="truncate text-sm text-foreground-muted">
                        {version.subject}
                      </p>
                      <p className="text-xs text-foreground-subtle">
                        {formatAppDateTime(version.createdAt)}
                        {version.changeNote ? ` · ${version.changeNote}` : ""}
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
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setVersionsOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>

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
              Saved {formatAppDateTime(previewVersion.createdAt)}
              {previewVersion.changeNote
                ? ` · ${previewVersion.changeNote}`
                : ""}
            </p>
            <div className="overflow-hidden rounded-[22px] border border-border bg-canvas">
              <div className="border-b border-border bg-surface px-5 py-4">
                <p className="text-xs text-foreground-subtle">Subject</p>
                <p className="mt-1 text-base font-semibold">
                  {applySamplePlaceholders(
                    previewVersion.subject,
                    detail.placeholders,
                  )}
                </p>
              </div>
              <div className="bg-surface px-5 py-6">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                  {applySamplePlaceholders(
                    previewVersion.body,
                    detail.placeholders,
                  )}
                </pre>
              </div>
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

      <Modal
        open={deleteOpen}
        title="Delete this template?"
        onClose={() => (deleting ? null : setDeleteOpen(false))}
      >
        {detail ? (
          <div className="space-y-4">
            <p className="text-sm text-foreground-muted">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">{detail.name}</span>
              ? This cannot be undone from the list (the template will be
              removed from Communications and Reminder Settings).
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void deleteTemplate()}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, delete"}
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

function EmailTemplatesPageHeader({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: () => void;
}) {
  return (
    <div className="relative shrink-0 pb-14 pr-0 sm:pb-16">
      <div className="min-w-0 max-w-3xl pr-4">
        <h1 className={ui.pageTitle}>Email templates</h1>
        <p className={ui.pageSubtitle}>
          Choose a template on the left, edit the email on the right, then
          preview and save.
        </p>
      </div>
      {/* Below the floating notifications bell (top-right of the shell). */}
      <div className="absolute right-0 top-16 z-10 sm:top-[4.25rem]">
        <Button type="button" onClick={onCreate} disabled={busy}>
          Create Template
        </Button>
      </div>
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
  onSubmit: (event: FormEvent) => void;
  onChange: (next: CreateFormState) => void;
}) {
  const createSubjectRef = useRef<HTMLInputElement>(null);
  const createBodyRef = useRef<HTMLTextAreaElement>(null);
  const insertRef = useRef<HTMLDivElement>(null);
  const lastFieldRef = useRef<"subject" | "body">("body");
  const [lastField, setLastField] = useState<"subject" | "body">("body");
  const [insertOpen, setInsertOpen] = useState(false);

  const placeholders = useMemo(
    () => getPlaceholdersForTemplate(form.code, form.category),
    [form.code, form.category],
  );

  useEffect(() => {
    if (!open) {
      setInsertOpen(false);
      lastFieldRef.current = "body";
      setLastField("body");
    }
  }, [open]);

  useEffect(() => {
    if (!insertOpen) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (
        insertRef.current &&
        !insertRef.current.contains(event.target as Node)
      ) {
        setInsertOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [insertOpen]);

  function insertPlaceholder(token: string) {
    const snippet = `{{${token}}}`;
    const field = lastFieldRef.current;
    const target =
      field === "subject" ? createSubjectRef.current : createBodyRef.current;

    if (!target) {
      onChange({
        ...form,
        [field]: `${form[field]}${snippet}`,
      });
      setInsertOpen(false);
      return;
    }

    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? target.value.length;
    const nextValue =
      target.value.slice(0, start) + snippet + target.value.slice(end);

    onChange({ ...form, [field]: nextValue });
    setInsertOpen(false);
    requestAnimationFrame(() => {
      target.focus();
      const cursor = start + snippet.length;
      target.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <Modal open={open} title="Create template" onClose={onClose} className="max-w-xl">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <FieldLabel htmlFor="create-template-name" required>
            Template name
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

        <div className="space-y-1">
          <FieldLabel htmlFor="create-template-subject" required>
            Subject
          </FieldLabel>
          <input
            id="create-template-subject"
            ref={createSubjectRef}
            className={ui.input}
            value={form.subject}
            onFocus={() => {
              lastFieldRef.current = "subject";
              setLastField("subject");
            }}
            onChange={(event) =>
              onChange({ ...form, subject: event.target.value })
            }
            required
            disabled={creating}
          />
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <FieldLabel htmlFor="create-template-body" required>
              Email body
            </FieldLabel>
            <div className="relative" ref={insertRef}>
              <Button
                type="button"
                variant="secondary"
                className="h-9 gap-1.5 px-3 text-xs"
                disabled={creating || placeholders.length === 0}
                onClick={() => setInsertOpen((open) => !open)}
              >
                <IconPlus className="h-3.5 w-3.5" />
                Insert variable
              </Button>
              {insertOpen ? (
                <div
                  className={cn(
                    ui.dropdown,
                    "right-0 bottom-full mb-1 max-h-64 w-56 overflow-y-auto py-1",
                  )}
                >
                  <p className="px-3 py-1.5 text-[11px] font-semibold tracking-wide text-foreground-subtle uppercase">
                    Insert into {lastField}
                  </p>
                  {placeholders.map((token) => (
                    <button
                      key={token}
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left hover:bg-surface-muted"
                      onClick={() => insertPlaceholder(token)}
                    >
                      <span className="text-sm text-foreground">
                        {placeholderLabel(token)}
                      </span>
                      <span className="font-mono text-[11px] text-foreground-subtle">
                        {`{{${token}}}`}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <textarea
            id="create-template-body"
            ref={createBodyRef}
            className={cn(ui.input, "min-h-36 py-3")}
            value={form.body}
            onFocus={() => {
              lastFieldRef.current = "body";
              setLastField("body");
            }}
            onChange={(event) =>
              onChange({ ...form, body: event.target.value })
            }
            required
            disabled={creating}
          />
          {placeholders.length > 0 ? (
            <p className={ui.hint}>
              Available:{" "}
              {placeholders.map((token) => `{{${token}}}`).join(", ")}
            </p>
          ) : (
            <p className={ui.hint}>
              Choose Intimation, Reminder, or Alerts to see variables for this
              category. Others has no documented variables.
            </p>
          )}
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
