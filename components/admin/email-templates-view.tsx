"use client";

import { useCallback, useState } from "react";

import {
  formatPlaceholderTokens,
  type EmailTemplateDetail,
  type EmailTemplateListItem,
  type EmailTemplatesPageData,
} from "@/lib/admin/email-templates.shared";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type EmailTemplatesViewProps = {
  initialData: EmailTemplatesPageData;
};

type EditorFormState = {
  subject: string;
  body: string;
  changeNote: string;
};

function toFormState(template: EmailTemplateDetail): EditorFormState {
  return {
    subject: template.subject,
    body: template.body,
    changeNote: "",
  };
}

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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revertingVersion, setRevertingVersion] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applyDetail = useCallback((next: EmailTemplateDetail) => {
    setDetail(next);
    setForm(toFormState(next));
    setSelectedCode(next.code);
    setTemplates((current) =>
      current.map((item) =>
        item.code === next.code
          ? {
              ...item,
              subject: next.subject,
              currentVersion: next.currentVersion,
            }
          : item,
      ),
    );
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
    setSelectedCode(code);
    if (code) {
      void loadTemplate(code);
    }
  };

  const reloadTemplate = async () => {
    if (!selectedCode) {
      return;
    }
    await loadTemplate(selectedCode);
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
      setSuccess("Email template saved.");
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
        throw new Error(body.error ?? "Failed to revert email template");
      }

      applyDetail(body.data as EmailTemplateDetail);
      setSuccess(`Template reverted to version ${version}.`);
    } catch (revertError) {
      setError(
        revertError instanceof Error
          ? revertError.message
          : "Failed to revert email template",
      );
    } finally {
      setRevertingVersion(null);
    }
  };

  if (!detail || templates.length === 0) {
    return (
      <p className="rounded-md border border-warning-border bg-warning-muted px-3 py-2 text-sm text-warning">
        No email templates are available.
      </p>
    );
  }

  const selectedTemplate = templates.find((item) => item.code === selectedCode);

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-success-border bg-success-muted px-3 py-2 text-sm text-success">
          {success}
        </p>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="templateSelect" className="text-sm font-medium text-foreground-muted">
              Template
            </label>
            <select
              id="templateSelect"
              value={selectedCode}
              onChange={(event) => handleSelect(event.target.value)}
              disabled={loading || saving || revertingVersion !== null}
              className="w-full max-w-xl rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {templates.map((template: EmailTemplateListItem) => (
                <option key={template.code} value={template.code}>
                  {template.name} (v{template.currentVersion})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground-muted">
            <p>
              <span className="font-medium text-foreground">Code:</span>{" "}
              <span className="font-mono">{detail.code}</span>
            </p>
            <p className="mt-1">
              <span className="font-medium text-foreground">Current version:</span>{" "}
              v{detail.currentVersion}
              {selectedTemplate ? ` · ${selectedTemplate.subject}` : null}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Format</h2>
          <p className="text-sm text-foreground-muted">
            Edit the subject and body for the selected template. Use placeholders
            where shown — they are replaced with real values when the email is sent.
          </p>
        </div>

        <p className="mt-4 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground-muted">
          Placeholders: {formatPlaceholderTokens(detail.placeholders)}
        </p>

        <form onSubmit={(event) => void saveTemplate(event)} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label htmlFor="templateSubject" className="text-sm font-medium text-foreground-muted">
              Subject
            </label>
            <input
              id="templateSubject"
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="templateBody" className="text-sm font-medium text-foreground-muted">
              Body
            </label>
            <textarea
              id="templateBody"
              rows={10}
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="changeNote" className="text-sm font-medium text-foreground-muted">
              Change note
            </label>
            <input
              id="changeNote"
              value={form.changeNote}
              onChange={(event) =>
                setForm((current) => ({ ...current, changeNote: event.target.value }))
              }
              placeholder="Optional note for this version"
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving || loading || revertingVersion !== null}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void reloadTemplate()}
              disabled={saving || loading || revertingVersion !== null}
              className="rounded-md border border-border-strong px-4 py-2 text-sm font-medium text-foreground-muted hover:bg-surface-muted disabled:opacity-60"
            >
              {loading ? "Reloading…" : "Reload"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface p-5">
        <h3 className="text-lg font-semibold text-foreground">Version history</h3>
        <p className="mt-1 text-sm text-foreground-muted">
          Each save creates a new version. Revert copies an older version forward
          without deleting history.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-foreground-subtle">
              <tr>
                <th className="px-3 py-2 font-medium">Version</th>
                <th className="px-3 py-2 font-medium">Subject</th>
                <th className="px-3 py-2 font-medium">Saved</th>
                <th className="px-3 py-2 font-medium">Note</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {detail.versions.map((version) => (
                <tr key={version.version} className="border-b border-border">
                  <td className="px-3 py-2 font-medium text-foreground">
                    v{version.version}
                  </td>
                  <td className="px-3 py-2 text-foreground-muted">{version.subject}</td>
                  <td className="px-3 py-2 text-foreground-muted">
                    {formatDateTime(version.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-foreground-muted">
                    {version.changeNote ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void revertToVersion(version.version)}
                      disabled={
                        saving ||
                        loading ||
                        revertingVersion === version.version
                      }
                      className="text-sm font-medium text-foreground-muted hover:text-foreground disabled:opacity-60"
                    >
                      {revertingVersion === version.version
                        ? "Reverting…"
                        : "Revert"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
