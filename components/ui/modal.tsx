"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { cn } from "@/lib/ui/classes";

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
  /** Wider dialog; ignored when `className` sets a `max-w-*` utility. */
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

  const classNameSetsMaxWidth = Boolean(className?.match(/\bmax-w-/));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-full rounded-[28px] border border-border bg-surface p-6 shadow-[var(--shadow-md)]",
          !classNameSetsMaxWidth && (wide ? "max-w-3xl" : "max-w-lg"),
          "relative z-[101] max-h-[90vh] overflow-y-auto",
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="pr-2 text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <ModalCloseButton onClick={onClose} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
