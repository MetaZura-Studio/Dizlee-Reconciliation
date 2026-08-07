/**
 * Accessible table frame, header/body rows, and sortable column headers wired to shared sort direction types.
 */

import type { ReactNode, TableHTMLAttributes } from "react";

import { cn, ui } from "@/lib/ui/classes";
import type { SortDirection } from "@/lib/ui/sort";

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
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn(
        ui.tableHeadCell,
        align === "right" ? "text-right" : "text-left",
        className,
      )}
    >
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
  align?: "left" | "right";
  className?: string;
}) {
  const ariaSort = active
    ? direction === "asc"
      ? "ascending"
      : "descending"
    : "none";

  return (
    <th
      className={cn(
        ui.tableHeadCell,
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      aria-sort={ariaSort}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          "inline-flex items-center gap-1 font-semibold tracking-wide transition-colors hover:text-foreground",
          active ? "text-foreground" : "text-foreground-muted",
          align === "right" ? "ml-auto" : "",
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
  align?: "left" | "right";
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn(
        ui.tableCell,
        align === "right" ? "text-right tabular-nums" : "text-left",
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
