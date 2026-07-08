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
    initialData.selected ? toFormState(initialData.selected) : { subject: "", body: "", changeNote: "" },
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
    if (code === selectedCode) {
      return;
    }
    void loadTemplate(code);
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

  if (!detail) {
    return (
      <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        No email templates are available.
      </p>
    );
  }

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

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <section className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Templates
          </h2>
          <ul className="mt-3 space-y-1">
            {templates.map((template: EmailTemplateListItem) => {
              const isActive = template.code === selectedCode;
              return (
                <li key={template.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(template.code)}
                    disabled={loading || saving || revertingVersion !== null}
                    className={`w-full rounded-md px-3 py-2 text-left text-sm transition ${
                      isActive
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    <span className="block font-medium">{template.name}</span>
                    <span
                      className={`block text-xs ${isActive ? "text-zinc-300" : "text-zinc-500"}`}
                    >
                      v{template.currentVersion}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="space-y-6">
          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-zinc-900">
                {detail.name}
              </h2>
              <p className="text-sm text-zinc-600">
                Code: <span className="font-mono">{detail.code}</span> · Current
                version v{detail.currentVersion}
              </p>
            </div>

            <p className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600">
              Placeholders: {formatPlaceholderTokens(detail.placeholders)}
            </p>

            <form onSubmit={(event) => void saveTemplate(event)} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="templateSubject" className="text-sm font-medium text-zinc-700">
                  Subject
                </label>
                <input
                  id="templateSubject"
                  value={form.subject}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="templateBody" className="text-sm font-medium text-zinc-700">
                  Body
                </label>
                <textarea
                  id="templateBody"
                  rows={8}
                  value={form.body}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, body: event.target.value }))
                  }
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="changeNote" className="text-sm font-medium text-zinc-700">
                  Change note
                </label>
                <input
                  id="changeNote"
                  value={form.changeNote}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, changeNote: event.target.value }))
                  }
                  placeholder="Optional note for this version"
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving || loading || revertingVersion !== null}
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => void reloadTemplate()}
                  disabled={saving || loading || revertingVersion !== null}
                  className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
                >
                  {loading ? "Reloading…" : "Reload"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-zinc-900">Version history</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-zinc-200 text-zinc-500">
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
                    <tr key={version.version} className="border-b border-zinc-100">
                      <td className="px-3 py-2 font-medium text-zinc-900">
                        v{version.version}
                      </td>
                      <td className="px-3 py-2 text-zinc-700">{version.subject}</td>
                      <td className="px-3 py-2 text-zinc-700">
                        {formatDateTime(version.createdAt)}
                      </td>
                      <td className="px-3 py-2 text-zinc-600">
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
                          className="text-sm font-medium text-zinc-700 hover:text-zinc-900 disabled:opacity-60"
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
          </div>
        </section>
      </div>
    </div>
  );
}
