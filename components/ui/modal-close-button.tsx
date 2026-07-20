"use client";

import { IconClose } from "@/components/ui/icons";
import { cn, ui } from "@/lib/ui/classes";

type ModalCloseButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/** Red close control with white X — shared across all portal popups. */
export function ModalCloseButton({
  onClick,
  disabled = false,
  className,
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(ui.modalCloseButton, className)}
      aria-label="Close"
      title="Close"
    >
      <IconClose className="h-4 w-4" strokeWidth={2.2} />
    </button>
  );
}
