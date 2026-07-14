"use client";

import { Button } from "@/components/ui/button";

type ListPaginationProps = {
  total: number;
  page: number;
  totalPages: number;
  noun: string;
  nounPlural?: string;
  onPageChange: (page: number) => void;
  loading?: boolean;
  className?: string;
};

export function ListPagination({
  total,
  page,
  totalPages,
  noun,
  nounPlural,
  onPageChange,
  loading = false,
  className,
}: ListPaginationProps) {
  if (total === 0) {
    return null;
  }

  const label = total === 1 ? noun : (nounPlural ?? `${noun}s`);

  return (
    <div
      className={
        className ??
        "flex items-center justify-between text-sm text-foreground-muted"
      }
    >
      <p>
        {total} {label}
        {loading ? " · refreshing…" : ""}
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
