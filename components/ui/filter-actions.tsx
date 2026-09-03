/**
 * Shared filter toolbar actions: Apply → Clear filters → Refresh (icon), right-aligned.
 */

"use client";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { IconRefresh } from "@/components/ui/icons";
import { cn } from "@/lib/ui/classes";

type FilterActionsProps = {
  onClear: () => void;
  onApply?: () => void;
  onRefresh?: () => void;
  applyLabel?: string;
  clearLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  /** Use type="submit" for Apply when inside a <form>. */
  applyType?: "button" | "submit";
};

export function FilterActions({
  onClear,
  onApply,
  onRefresh,
  applyLabel = "Apply",
  clearLabel = "Clear filters",
  loading = false,
  disabled = false,
  className,
  applyType = "button",
}: FilterActionsProps) {
  const busy = loading || disabled;
  const showApply = onApply != null || applyType === "submit";

  return (
    <div className={cn("flex w-full flex-wrap items-center justify-end gap-3", className)}>
      {showApply ? (
        <Button type={applyType} onClick={onApply} disabled={busy}>
          {applyLabel}
        </Button>
      ) : null}
      <Button type="button" variant="secondary" onClick={onClear} disabled={busy}>
        {clearLabel}
      </Button>
      {onRefresh ? (
        <IconButton
          type="button"
          label="Refresh"
          disabled={busy}
          onClick={onRefresh}
        >
          <IconRefresh />
        </IconButton>
      ) : null}
    </div>
  );
}
