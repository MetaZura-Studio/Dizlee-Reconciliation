"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn, ui } from "@/lib/ui/classes";

export function Modal({
  open,
  title,
  children,
  onClose,
  className,
  wide,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          ui.modal,
          wide ? "max-w-3xl" : "max-w-lg",
          "relative z-[101] max-h-[90vh] overflow-y-auto bg-surface",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-sm text-foreground-subtle transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
