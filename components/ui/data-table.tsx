/**
 * Accessible table frame, header/body rows, and sortable column headers wired to shared sort direction types.
 * Column alignment: heading and cell must use the same align value (left | center | right).
 */

import type { ReactNode, TableHTMLAttributes } from "react";

import { cn, tableAlignClass, ui, type TableAlign } from "@/lib/ui/classes";
import type { SortDirection } from "@/lib/ui/sort";

export type { TableAlign };

export function DataTableFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(ui.tableWrap, className)}>{children}</div>;
}

export function DataTable({
  children,
  className,
  ...props
}: TableHTMLAttributes<HTMLTableElement>) {
  return (
    <table className={cn(ui.table, className)} {...props}>
      {children}
    </table>
  );
}

export function DataTableHead({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <thead className={cn(ui.tableHead, className)}>{children}</thead>;
}

export function DataTableTh({
  children,
  className,
  align = "left",
}: {
  children: ReactNode;
  className?: string;
  align?: TableAlign;
}) {
  return (
    <th className={cn(ui.tableHeadCell, tableAlignClass(align), className)}>
      {children}
    </th>
  );
}

export function SortableDataTableTh({
  label,
  active,
  direction,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
  align?: TableAlign;
  className?: string;
}) {
  const ariaSort = active
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  const justify =
    align === "right"
      ? "justify-end"
      : align === "center"
        ? "justify-center"
        : "justify-start";

  return (
    <th
      className={cn(ui.tableHeadCell, tableAlignClass(align), className)}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex w-full items-center gap-1 font-semibold tracking-wide transition-colors hover:text-foreground",
          justify,
          active ? "text-foreground" : "text-foreground-muted",
        )}
      >
        <span>{label}</span>
        <span className="text-[11px] tabular-nums" aria-hidden>
          {active ? (direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </button>
    </th>
  );
}

export function DataTableTd({
  children,
  className,
  align = "left",
  colSpan,
}: {
  children?: ReactNode;
  className?: string;
  align?: TableAlign;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        ui.tableCell,
        tableAlignClass(align, { tabular: align === "right" }),
        className,
      )}
    >
      {children}
    </td>
  );
}

export function DataTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <tr className={cn(ui.tableRowHover, className)}>{children}</tr>;
}
