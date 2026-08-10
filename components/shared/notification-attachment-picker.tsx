"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { formatAppError } from "@/lib/errors/format";
import { ui } from "@/lib/ui/classes";

export const MAX_NOTIFICATION_ATTACHMENTS = 5;

type PendingAttachment = {
  fileId: string;
  filename: string;
};

type NotificationAttachmentPickerProps = {
  attachments: PendingAttachment[];
  onChange: (attachments: PendingAttachment[]) => void;
  disabled?: boolean;
};

export function NotificationAttachmentPicker({
  attachments,
  onChange,
  disabled = false,
}: NotificationAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || disabled || uploading) {
      return;
    }

    const remaining = MAX_NOTIFICATION_ATTACHMENTS - attachments.length;
    if (remaining <= 0) {
      setError(`At most ${MAX_NOTIFICATION_ATTACHMENTS} attachments are allowed.`);
      return;
    }

    const selected = Array.from(files).slice(0, remaining);
    setUploading(true);
    setError(null);

    const uploaded: PendingAttachment[] = [];

    try {
      for (const file of selected) {
        const formData = new FormData();
        formData.set("file", file);

        const response = await fetch("/api/dizlee/notifications/attachments", {
          method: "POST",
          body: formData,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(formatAppError(payload, `Failed to upload ${file.name}`));
        }

        uploaded.push({
          fileId: payload.data.fileId as string,
          filename: payload.data.filename as string,
        });
      }

      onChange([...attachments, ...uploaded]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload attachment",
      );
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function removeAttachment(fileId: string) {
    onChange(attachments.filter((attachment) => attachment.fileId !== fileId));
  }

  return (
    <div className="space-y-2">
      <div>
        <FieldLabel htmlFor="notification-attachments">Attachments</FieldLabel>
        <p className="mt-1 text-xs text-foreground-subtle">
          Optional files included with the notification (max{" "}
          {MAX_NOTIFICATION_ATTACHMENTS}, 10 MB each).
        </p>
      </div>

      <input
        ref={inputRef}
        id="notification-attachments"
        type="file"
        multiple
        disabled={
          disabled || uploading || attachments.length >= MAX_NOTIFICATION_ATTACHMENTS
        }
        className="block w-full text-sm text-foreground-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-surface-muted/80 disabled:opacity-60"
        onChange={(event) => void handleFilesSelected(event.target.files)}
      />

      {uploading ? (
        <p className="text-xs text-foreground-subtle">Uploading…</p>
      ) : null}

      {error ? <p className={`text-xs ${ui.alertError}`}>{error}</p> : null}

      {attachments.length > 0 ? (
        <ul className="space-y-2">
          {attachments.map((attachment) => (
            <li
              key={attachment.fileId}
              className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted/40 px-3 py-2 text-sm"
            >
              <span className="truncate text-foreground">{attachment.filename}</span>
              <Button
                type="button"
                variant="secondary"
                className="h-8 shrink-0 px-2 text-xs"
                disabled={disabled || uploading}
                onClick={() => removeAttachment(attachment.fileId)}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function attachmentFileIds(
  attachments: PendingAttachment[],
): string[] {
  return attachments.map((attachment) => attachment.fileId);
}

export type { PendingAttachment };
