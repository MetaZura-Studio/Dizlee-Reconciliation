"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { FieldLabel } from "@/components/ui/field";
import { IconUpload } from "@/components/ui/icons";
import { formatAppError } from "@/lib/errors/format";
import {
  MAX_NOTIFICATION_ATTACHMENTS,
  NOTIFICATION_ATTACHMENT_ACCEPT,
} from "@/lib/platform/notification-attachments.shared";
import { cn, ui } from "@/lib/ui/classes";

export { MAX_NOTIFICATION_ATTACHMENTS };

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
  const [isDragging, setIsDragging] = useState(false);

  const atLimit = attachments.length >= MAX_NOTIFICATION_ATTACHMENTS;
  const pickerDisabled = disabled || uploading || atLimit;

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || pickerDisabled) {
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

  function openPicker() {
    if (!pickerDisabled) inputRef.current?.click();
  }

  return (
    <div className="space-y-2">
      <div>
        <FieldLabel htmlFor="notification-attachments">Attachments</FieldLabel>
        <p className="mt-1 text-xs text-foreground-subtle">
          Optional files (max {MAX_NOTIFICATION_ATTACHMENTS}, 10 MB each). Allowed:
          PDF, images (not SVG), Excel, CSV, TXT.
        </p>
      </div>

      <input
        ref={inputRef}
        id="notification-attachments"
        type="file"
        multiple
        accept={NOTIFICATION_ATTACHMENT_ACCEPT}
        disabled={pickerDisabled}
        className="sr-only"
        onChange={(event) => void handleFilesSelected(event.target.files)}
      />

      <div
        role="button"
        tabIndex={pickerDisabled ? -1 : 0}
        aria-disabled={pickerDisabled || undefined}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!pickerDisabled) setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!pickerDisabled) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void handleFilesSelected(event.dataTransfer.files);
        }}
        className={cn(
          "relative flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed px-5 py-5 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary-muted/50"
            : "border-border-strong bg-primary-muted/15 hover:border-primary hover:bg-primary-muted/30",
          pickerDisabled && "pointer-events-none opacity-60",
        )}
      >
        <span className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-2.5 text-primary">
          <IconUpload className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-semibold text-foreground">
          {uploading ? "Uploading…" : "Drop files here or browse"}
        </p>
        <p className="mt-1 text-xs text-foreground-subtle">
          {atLimit
            ? `Maximum of ${MAX_NOTIFICATION_ATTACHMENTS} attachments reached`
            : "PDF, images, Excel, CSV, or TXT"}
        </p>
        {!uploading && !atLimit ? (
          <span className={`mt-4 ${ui.btnSecondary}`}>Choose files</span>
        ) : null}
      </div>

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
