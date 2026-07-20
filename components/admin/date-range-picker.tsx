"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/ui/classes";
import { getMaxMonthForYear } from "@/lib/platform/period";

export type DateRangeValue = {
  dateFrom: string;
  dateTo: string;
};

type DateRangePickerProps = {
  value: DateRangeValue;
  onApply: (value: DateRangeValue) => void;
  disabled?: boolean;
};

type PresetId =
  | "custom"
  | "today"
  | "last3"
  | "last7"
  | "last30"
  | "last3m"
  | "last6m"
  | "last1y";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const PRESETS: Array<{ id: PresetId; label: string }> = [
  { id: "custom", label: "Customised" },
  { id: "today", label: "Today" },
  { id: "last3", label: "Last 3 Days" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "last3m", label: "Last 3 Months" },
  { id: "last6m", label: "Last 6 Months" },
  { id: "last1y", label: "Last 1 Year" },
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseYmd(value: string): Date | null {
  if (!value) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function formatLongDate(value: string): string {
  const date = parseYmd(value);
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateRangeLabel(value: DateRangeValue): string {
  if (!value.dateFrom && !value.dateTo) {
    return "Select date range";
  }
  if (value.dateFrom && value.dateTo) {
    return `${formatLongDate(value.dateFrom)} — ${formatLongDate(value.dateTo)}`;
  }
  if (value.dateFrom) {
    return `From ${formatLongDate(value.dateFrom)}`;
  }
  return `Until ${formatLongDate(value.dateTo)}`;
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function presetRange(id: Exclude<PresetId, "custom">): DateRangeValue {
  const today = startOfDay(new Date());
  const end = today;
  const start = new Date(today);

  switch (id) {
    case "today":
      break;
    case "last3":
      start.setDate(today.getDate() - 2);
      break;
    case "last7":
      start.setDate(today.getDate() - 6);
      break;
    case "last30":
      start.setDate(today.getDate() - 29);
      break;
    case "last3m":
      start.setMonth(today.getMonth() - 3);
      break;
    case "last6m":
      start.setMonth(today.getMonth() - 6);
      break;
    case "last1y":
      start.setFullYear(today.getFullYear() - 1);
      break;
  }

  return { dateFrom: toYmd(start), dateTo: toYmd(end) };
}

function detectPreset(value: DateRangeValue): PresetId {
  if (!value.dateFrom || !value.dateTo) {
    return "custom";
  }

  for (const preset of PRESETS) {
    if (preset.id === "custom") {
      continue;
    }
    const range = presetRange(preset.id);
    if (range.dateFrom === value.dateFrom && range.dateTo === value.dateTo) {
      return preset.id;
    }
  }

  return "custom";
}

type CalendarPanelProps = {
  label: string;
  view: Date;
  onViewChange: (next: Date) => void;
  draftFrom: string;
  draftTo: string;
  onSelectDay: (ymd: string) => void;
};

function CalendarPanel({
  label,
  view,
  onViewChange,
  draftFrom,
  draftTo,
  onSelectDay,
}: CalendarPanelProps) {
  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 9 }, (_, index) => currentYear - 8 + index);
  const maxMonth = getMaxMonthForYear(year);

  const cells: Array<{ ymd: string; day: number } | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= totalDays; day += 1) {
    cells.push({ ymd: toYmd(new Date(year, month, day)), day });
  }

  const from = parseYmd(draftFrom);
  const to = parseYmd(draftTo);

  return (
    <div className="min-w-[240px] flex-1">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground-subtle">
        {label}
      </p>
      <div className="mb-3 flex gap-2">
        <select
          aria-label={`${label} month`}
          className="h-9 flex-1 rounded-xl border border-border bg-surface px-2 text-sm"
          value={month}
          onChange={(event) =>
            onViewChange(new Date(year, Number(event.target.value), 1))
          }
        >
          {MONTHS.slice(0, maxMonth).map((name, index) => (
            <option key={name} value={index}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} year`}
          className="h-9 w-24 rounded-xl border border-border bg-surface px-2 text-sm"
          value={year}
          onChange={(event) =>
            onViewChange(new Date(Number(event.target.value), month, 1))
          }
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-foreground-subtle">
        {WEEKDAYS.map((day, index) => (
          <span key={`${day}-${index}`} className="py-1">
            {day}
          </span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) {
            return <span key={`empty-${index}`} className="h-9" />;
          }

          const date = parseYmd(cell.ymd)!;
          const isStart = Boolean(from && toYmd(from) === cell.ymd);
          const isEnd = Boolean(to && toYmd(to) === cell.ymd);
          const inRange = Boolean(
            from && to && date >= from && date <= to && !isStart && !isEnd,
          );

          return (
            <button
              key={cell.ymd}
              type="button"
              onClick={() => onSelectDay(cell.ymd)}
              className={cn(
                "h-9 rounded-lg text-sm transition-colors",
                inRange && "bg-primary-muted text-primary",
                (isStart || isEnd) &&
                  "bg-primary font-semibold text-primary-foreground",
                !isStart &&
                  !isEnd &&
                  !inRange &&
                  "text-foreground hover:bg-surface-muted",
              )}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="3"
        y="4.5"
        width="14"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M3 8h14M7 3v3M13 3v3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DateRangePicker({
  value,
  onApply,
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRangeValue>(value);
  const [selecting, setSelecting] = useState<"from" | "to">("from");
  const [activePreset, setActivePreset] = useState<PresetId>(detectPreset(value));
  const [leftView, setLeftView] = useState(() => {
    const from = parseYmd(value.dateFrom) ?? new Date();
    return new Date(from.getFullYear(), from.getMonth(), 1);
  });
  const [rightView, setRightView] = useState(() => {
    const to = parseYmd(value.dateTo);
    if (to) {
      return new Date(to.getFullYear(), to.getMonth(), 1);
    }
    return addMonths(new Date(), 1);
  });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const openPicker = () => {
    if (disabled) {
      return;
    }
    setDraft(value);
    setActivePreset(detectPreset(value));
    setSelecting("from");
    const from = parseYmd(value.dateFrom) ?? new Date();
    const to = parseYmd(value.dateTo);
    setLeftView(new Date(from.getFullYear(), from.getMonth(), 1));
    setRightView(
      to
        ? new Date(to.getFullYear(), to.getMonth(), 1)
        : addMonths(new Date(from.getFullYear(), from.getMonth(), 1), 1),
    );
    setOpen(true);
  };

  const selectPreset = (id: PresetId) => {
    setActivePreset(id);
    if (id === "custom") {
      setSelecting("from");
      return;
    }
    const range = presetRange(id);
    setDraft(range);
    setSelecting("from");
    const from = parseYmd(range.dateFrom)!;
    const to = parseYmd(range.dateTo)!;
    setLeftView(new Date(from.getFullYear(), from.getMonth(), 1));
    setRightView(new Date(to.getFullYear(), to.getMonth(), 1));
  };

  const selectDay = (ymd: string) => {
    setActivePreset("custom");
    if (selecting === "from" || !draft.dateFrom || (draft.dateFrom && draft.dateTo)) {
      setDraft({ dateFrom: ymd, dateTo: "" });
      setSelecting("to");
      return;
    }

    const from = parseYmd(draft.dateFrom)!;
    const next = parseYmd(ymd)!;
    if (next < from) {
      setDraft({ dateFrom: ymd, dateTo: draft.dateFrom });
    } else {
      setDraft({ dateFrom: draft.dateFrom, dateTo: ymd });
    }
    setSelecting("from");
  };

  const clearDraft = () => {
    setDraft({ dateFrom: "", dateTo: "" });
    setActivePreset("custom");
    setSelecting("from");
  };

  const handleApply = () => {
    onApply(draft);
    setOpen(false);
  };

  const triggerActive = Boolean(value.dateFrom || value.dateTo);

return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPicker())}
        className={cn(
          "inline-flex h-10 max-w-full items-center gap-2 rounded-2xl border px-3 text-sm font-medium transition-colors",
          triggerActive
            ? "border-primary bg-primary-muted text-primary"
            : "border-border bg-surface text-foreground-muted hover:bg-surface-muted",
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{formatDateRangeLabel(value)}</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Select date range"
            className="max-h-[min(90vh,720px)] w-full max-w-4xl overflow-auto rounded-2xl border border-border bg-surface shadow-[var(--shadow-md)]"
          >
            <div className="flex flex-col lg:flex-row">
              <aside className="border-b border-border bg-surface-muted/40 p-3 lg:w-48 lg:shrink-0 lg:border-b-0 lg:border-r">
                <ul className="space-y-0.5">
                  {PRESETS.map((preset) => {
                    const active = activePreset === preset.id;
                    return (
                      <li key={preset.id}>
                        <button
                          type="button"
                          onClick={() => selectPreset(preset.id)}
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition-colors",
                            active
                              ? "bg-primary-muted font-semibold text-primary"
                              : "text-foreground-muted hover:bg-surface-muted",
                          )}
                        >
                          <span>{preset.label}</span>
                          {active ? <span aria-hidden="true">»</span> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </aside>

              <div className="min-w-0 flex-1 p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <input
                    readOnly
                    value={formatDateRangeLabel(draft)}
                    className="h-10 min-w-[12rem] flex-1 rounded-xl border border-border bg-surface px-3 text-sm text-foreground"
                  />
                  <button
                    type="button"
                    onClick={clearDraft}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Clear filters
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleApply}>Apply</Button>
                  </div>
                </div>

                <div className="flex flex-col gap-6 md:flex-row">
                  <CalendarPanel
                    label="From"
                    view={leftView}
                    onViewChange={setLeftView}
                    draftFrom={draft.dateFrom}
                    draftTo={draft.dateTo}
                    onSelectDay={selectDay}
                  />
                  <CalendarPanel
                    label="To"
                    view={rightView}
                    onViewChange={setRightView}
                    draftFrom={draft.dateFrom}
                    draftTo={draft.dateTo}
                    onSelectDay={selectDay}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
