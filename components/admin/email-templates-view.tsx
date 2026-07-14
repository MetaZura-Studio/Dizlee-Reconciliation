"use client";

import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { FilterToolbar, PageCard } from "@/components/ui/page";
import {
  formatPlaceholderTokens,
  type EmailTemplateDetail,
  type EmailTemplateListItem,
  type EmailTemplatesPageData,
} from "@/lib/admin/email-templates.shared";
import { ui } from "@/lib/ui/classes";

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
    return <p className={ui.alertWarning}>No email templates are available.</p>;
  }

  const selectedTemplate = templates.find((item) => item.code === selectedCode);

  return (
    <div className="space-y-6">
      {error ? <p className={ui.alertError}>{error}</p> : null}
      {success ? <p className={ui.alertSuccess}>{success}</p> : null}

      <PageCard>
        <FilterToolbar>
          <div className="w-full space-y-1">
            <label htmlFor="templateSelect" className={ui.label}>
              Template
            </label>
            <select
              id="templateSelect"
              value={selectedCode}
              onChange={(event) => handleSelect(event.target.value)}
              disabled={loading || saving || revertingVersion !== null}
              className={`${ui.select} max-w-xl disabled:opacity-60`}
            >
              {templates.map((template: EmailTemplateListItem) => (
                <option key={template.code} value={template.code}>
                  {template.name} (v{template.currentVersion})
                </option>
              ))}
            </select>
          </div>
        </FilterToolbar>

        <div className={`mt-4 ${ui.cardPadding} text-sm text-foreground-muted`}>
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
      </PageCard>

      <PageCard>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Format</h2>
          <p className="text-sm text-foreground-muted">
            Edit the subject and body for the selected template. Use placeholders
            where shown — they are replaced with real values when the email is sent.
          </p>
        </div>

        <p className={`mt-4 ${ui.cardPadding} text-sm text-foreground-muted`}>
          Placeholders: {formatPlaceholderTokens(detail.placeholders)}
        </p>

        <form onSubmit={(event) => void saveTemplate(event)} className="mt-4 space-y-4">
          <div className="space-y-1">
            <label htmlFor="templateSubject" className={ui.label}>
              Subject
            </label>
            <input
              id="templateSubject"
              value={form.subject}
              onChange={(event) =>
                setForm((current) => ({ ...current, subject: event.target.value }))
              }
              className={ui.input}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="templateBody" className={ui.label}>
              Body
            </label>
            <textarea
              id="templateBody"
              rows={10}
              value={form.body}
              onChange={(event) =>
                setForm((current) => ({ ...current, body: event.target.value }))
              }
              className={`${ui.input} min-h-[10rem] py-3`}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="changeNote" className={ui.label}>
              Change note
            </label>
            <input
              id="changeNote"
              value={form.changeNote}
              onChange={(event) =>
                setForm((current) => ({ ...current, changeNote: event.target.value }))
              }
              placeholder="Optional note for this version"
              className={ui.input}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={saving || loading || revertingVersion !== null}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void reloadTemplate()}
              disabled={saving || loading || revertingVersion !== null}
            >
              {loading ? "Reloading…" : "Reload"}
            </Button>
          </div>
        </form>
      </PageCard>

      <PageCard>
        <h3 className="text-lg font-semibold text-foreground">Version history</h3>
        <p className="mt-1 text-sm text-foreground-muted">
          Each save creates a new version. Revert copies an older version forward
          without deleting history.
        </p>
        <div className="mt-4">
          <DataTableFrame>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>Version</DataTableTh>
                  <DataTableTh>Subject</DataTableTh>
                  <DataTableTh>Saved</DataTableTh>
                  <DataTableTh>Note</DataTableTh>
                  <DataTableTh>Actions</DataTableTh>
                </tr>
              </DataTableHead>
              <tbody>
                {detail.versions.map((version) => (
                  <DataTableRow key={version.version}>
                    <DataTableTd className="font-medium text-foreground">
                      v{version.version}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {version.subject}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {formatDateTime(version.createdAt)}
                    </DataTableTd>
                    <DataTableTd className="text-foreground-muted">
                      {version.changeNote ?? "—"}
                    </DataTableTd>
                    <DataTableTd>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => void revertToVersion(version.version)}
                        disabled={
                          saving ||
                          loading ||
                          revertingVersion === version.version
                        }
                      >
                        {revertingVersion === version.version
                          ? "Reverting…"
                          : "Revert"}
                      </Button>
                    </DataTableTd>
                  </DataTableRow>
                ))}
              </tbody>
            </DataTable>
          </DataTableFrame>
        </div>
      </PageCard>
    </div>
  );
}
