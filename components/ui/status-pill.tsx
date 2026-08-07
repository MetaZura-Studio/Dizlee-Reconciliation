/**
 * Compact status chip mapping semantic tones (success, warning, info, danger, neutral) to border/background tokens.
 */

import type { ReactNode } from "react";

import { cn, ui } from "@/lib/ui/classes";

type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";

const toneClass: Record<StatusTone, string> = {
  success: "border-success-border bg-success-muted text-success",
  warning: "border-warning-border bg-warning-muted text-warning",
  info: "border-border bg-primary-muted text-primary",
  danger: "border-danger-border bg-danger-muted text-danger",
  neutral: "border-border bg-surface-muted text-foreground-muted",
};

export function StatusPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn(ui.badge, toneClass[tone], className)}>{children}</span>
  );
}
