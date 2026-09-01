/**
 * Preview cell display helpers: app date format, Arabic font/RTL, numeric alignment.
 */

import type { ReactNode } from "react";

import {
  formatAppDate,
  formatAppDateTime,
} from "@/lib/platform/format-datetime";
import { cn, type TableAlign } from "@/lib/ui/classes";

const ARABIC_SCRIPT = /\p{Script=Arabic}/u;
const NUMERIC_CELL = /^-?\d+(\.\d+)?$/;
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/;
const APP_DATE = /^\d{2}\/\d{2}\/\d{4}(, \d{2}:\d{2})?$/;

export function containsArabicScript(text: string): boolean {
  return ARABIC_SCRIPT.test(text);
}

export function isNumericCellValue(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }
  return NUMERIC_CELL.test(trimmed);
}

export function isAppDateCellValue(text: string): boolean {
  return APP_DATE.test(text.trim());
}

/** Reformat ISO date strings from Excel/storage into app date/time format. */
export function formatPreviewCellValue(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return raw;
  }

  if (ISO_DATE_ONLY.test(trimmed)) {
    const [year, month, day] = trimmed.split("-").map(Number);
    if (!year || !month || !day) {
      return raw;
    }
    const formatted = formatAppDate(new Date(year, month - 1, day));
    return formatted === "—" ? raw : formatted;
  }

  if (ISO_DATE_TIME.test(trimmed)) {
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return raw;
    }
    const hasTime =
      date.getUTCHours() !== 0 ||
      date.getUTCMinutes() !== 0 ||
      date.getUTCSeconds() !== 0 ||
      date.getUTCMilliseconds() !== 0;
    const formatted = hasTime ? formatAppDateTime(date) : formatAppDate(date);
    return formatted === "—" ? raw : formatted;
  }

  return raw;
}

export type PreviewCellAlign = TableAlign;

/**
 * Preview column alignment by cell type.
 * Priority: Arabic → right; numeric → right; app date/datetime → center; else left.
 */
export function previewCellAlign(raw: string): PreviewCellAlign {
  const display = formatPreviewCellValue(raw);
  if (containsArabicScript(display)) {
    return "right";
  }
  if (isNumericCellValue(display)) {
    return "right";
  }
  if (isAppDateCellValue(display)) {
    return "center";
  }
  return "left";
}

type LocalizedCellTextProps = {
  children: ReactNode;
  className?: string;
  title?: string;
};

/** Renders cell text with Arabic script font (Noto Sans Arabic) and RTL. */
export function LocalizedCellText({
  children,
  className,
  title,
}: LocalizedCellTextProps) {
  const text = typeof children === "string" ? children : "";
  const arabic = text.length > 0 && containsArabicScript(text);

  return (
    <span
      dir={arabic ? "rtl" : undefined}
      lang={arabic ? "ar" : undefined}
      title={title}
      className={cn(
        arabic && "font-arabic block w-full text-right",
        className,
      )}
    >
      {children}
    </span>
  );
}
