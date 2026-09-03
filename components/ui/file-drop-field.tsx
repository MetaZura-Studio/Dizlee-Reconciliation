/**
 * Shared dashed dropzone + browse control for file uploads.
 * Matches report-upload styling so bare browser file inputs are never used alone.
 */

"use client";

import {
  forwardRef,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { IconUpload } from "@/components/ui/icons";
import { formatFileSizeLabel } from "@/components/shared/report-upload-review-modal";
import { cn, ui } from "@/lib/ui/classes";

export type FileDropFieldHandle = {
  open: () => void;
  clear: () => void;
};

type FileDropFieldProps = {
  id?: string;
  name?: string;
  accept: string;
  /** Shown under the empty-state title, e.g. "PDF only (.pdf)". */
  hint: string;
  /** Empty-state title. Default: "Drop file here or browse". */
  emptyLabel?: string;
  value?: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  required?: boolean;
  /** Smaller height for dialogs. */
  compact?: boolean;
  className?: string;
};

export const FileDropField = forwardRef<FileDropFieldHandle, FileDropFieldProps>(
  function FileDropField(
    {
      id,
      name,
      accept,
      hint,
      emptyLabel = "Drop file here or browse",
      value = null,
      onChange,
      disabled = false,
      required = false,
      compact = false,
      className,
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => {
        if (!disabled) inputRef.current?.click();
      },
      clear: () => {
        if (inputRef.current) inputRef.current.value = "";
      },
    }));

    function openPicker() {
      if (disabled) return;
      inputRef.current?.click();
    }

    function applyFile(file: File | null) {
      onChange(file);
      if (!file && inputRef.current) {
        inputRef.current.value = "";
      }
    }

    function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
      applyFile(event.target.files?.[0] ?? null);
    }

    function handleDrop(event: React.DragEvent<HTMLDivElement>) {
      event.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = event.dataTransfer.files?.[0] ?? null;
      if (file) {
        applyFile(file);
      }
    }

    return (
      <div className={cn("w-full", className)}>
        <input
          ref={inputRef}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          required={required && !value}
          disabled={disabled}
          className="sr-only"
          onChange={handleInputChange}
        />
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={`${inputId}-label`}
          aria-disabled={disabled || undefined}
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openPicker();
            }
          }}
          onDragEnter={(event) => {
            event.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDrop={handleDrop}
          className={cn(
            "relative flex cursor-pointer flex-col items-center justify-center rounded-[22px] border border-dashed px-5 text-center transition-colors",
            compact
              ? "min-h-[7.5rem] py-5"
              : "min-h-[9.5rem] py-6 sm:min-h-[10.5rem]",
            isDragging
              ? "border-primary bg-primary-muted/50"
              : "border-border-strong bg-primary-muted/15 hover:border-primary hover:bg-primary-muted/30",
            disabled && "pointer-events-none opacity-60",
          )}
        >
          <span
            id={`${inputId}-label`}
            className="inline-flex items-center justify-center rounded-2xl bg-primary/10 p-2.5 text-primary"
          >
            <IconUpload className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-semibold text-foreground sm:text-base">
            {value ? value.name : emptyLabel}
          </p>
          <p className="mt-1 text-xs text-foreground-subtle sm:text-sm">
            {value ? formatFileSizeLabel(value.size) : hint}
          </p>
          {!value ? (
            <span className={`mt-4 ${ui.btnSecondary}`}>Choose file</span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={(event) => {
                event.stopPropagation();
                openPicker();
              }}
            >
              Replace file
            </Button>
          )}
        </div>
      </div>
    );
  },
);
