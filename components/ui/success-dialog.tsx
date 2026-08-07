/**
 * Confirmation-style modal preset for post-action success (title, message, single primary action).
 */

"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type SuccessDialogProps = {
  open: boolean;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function SuccessDialog({
  open,
  title,
  message,
  actionLabel,
  onAction,
}: SuccessDialogProps) {
  return (
    <Modal open={open} title={title} onClose={onAction} className="max-w-md">
      <p className="text-sm text-foreground-muted">{message}</p>
      <div className="mt-6 flex justify-end">
        <Button onClick={onAction}>{actionLabel}</Button>
      </div>
    </Modal>
  );
}
