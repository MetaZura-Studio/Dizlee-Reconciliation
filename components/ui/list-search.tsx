"use client";

import { ui } from "@/lib/ui/classes";

type ListSearchProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  "aria-label"?: string;
  className?: string;
};

/** Standalone keyword search — sits above filters, updates as you type. */
export function ListSearch({
  value,
  onChange,
  placeholder,
  "aria-label": ariaLabel,
  className = "mt-4",
}: ListSearchProps) {
  return (
    <div className={className}>
      <label className="block text-sm">
        <span className={ui.label}>Search</span>
        <input
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel ?? "Search"}
          className={ui.input}
        />
      </label>
    </div>
  );
}

/** Divider between live search and structured filters. */
export function OrFiltersDivider({ className = "mt-4" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`} role="separator">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs font-medium uppercase tracking-wide text-foreground-subtle">
        or filters
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}
