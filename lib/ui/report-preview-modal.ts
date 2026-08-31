/** Shared layout classes for report upload / raw-file preview dialogs. */

import { cn } from "@/lib/ui/classes";

export const reportPreviewBackdropClass =
  "fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 p-3 pl-8 pr-4 backdrop-blur-[2px] sm:items-center sm:p-5 sm:pl-12 sm:pr-6";

/** Base shell (height/chrome). Pair with `reportPreviewShellWidthClass(columnCount)`. */
export const reportPreviewShellClass =
  "flex h-[84vh] w-full flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)] sm:h-[82vh]";

/** Parsed detail: shrink to content, only grow (and scroll) up to viewport. */
export const reportPreviewDetailShellClass =
  "flex max-h-[84vh] w-full flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)] sm:max-h-[82vh]";

export const reportPreviewBodyClass =
  "flex min-h-0 flex-1 flex-col overflow-hidden px-5 py-3 sm:px-6 sm:py-4";

export const reportPreviewDetailBodyClass =
  "flex min-h-0 flex-col overflow-y-auto px-5 py-3 sm:px-6 sm:py-4";

export const reportPreviewTableScrollClass =
  "min-h-0 flex-1 overflow-auto rounded-[20px] border border-border bg-surface";

/** Line-items frame: height follows rows; scrolls after a reasonable cap. */
export const reportPreviewTableFitClass =
  "max-h-[min(48vh,28rem)] overflow-auto rounded-[20px] border border-border bg-surface";

/**
 * Max width for preview dialogs by data column count.
 * Pass `null`/`undefined` while loading for a mid-size default.
 * Tiers: 1–5 → max-w-3xl; 6–8 → max-w-5xl; 9–11 → max-w-6xl; 12+ → max-w-[88vw].
 */
export function reportPreviewShellWidthClass(
  columnCount: number | null | undefined,
): string {
  if (columnCount == null || !Number.isFinite(columnCount) || columnCount < 1) {
    return "max-w-4xl";
  }
  if (columnCount <= 5) {
    return "max-w-3xl";
  }
  if (columnCount <= 8) {
    return "max-w-5xl";
  }
  if (columnCount <= 11) {
    return "max-w-6xl";
  }
  return "max-w-[88vw]";
}

/** Compose base shell + width tier (+ optional extras). */
export function reportPreviewShellClasses(
  columnCount: number | null | undefined,
  extra?: string,
): string {
  return cn(
    reportPreviewShellClass,
    reportPreviewShellWidthClass(columnCount),
    extra,
  );
}

/** Content-height shell for parsed report detail modals. */
export function reportPreviewDetailShellClasses(
  columnCount: number | null | undefined,
  extra?: string,
): string {
  return cn(
    reportPreviewDetailShellClass,
    reportPreviewShellWidthClass(columnCount),
    extra,
  );
}
