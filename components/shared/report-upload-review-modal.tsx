"use client";

import { useEffect } from "react";

import { ReportLineItemsTable } from "@/components/shared/report-line-items-table";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { LoadingOverlay } from "@/components/ui/loading";
import type { ReportPreviewLineItem } from "@/lib/platform/report-preview";
import { ui } from "@/lib/ui/classes";

type ReportUploadReviewModalProps = {
  filename: string;
  subtitle?: string;
  fileSizeLabel?: string;
  /** Parsed/mapped line items (legacy confirm flow). */
  lineItems?: ReportPreviewLineItem[];
  currencyCode?: string;
  side?: "opco" | "partner";
  /** Raw spreadsheet rows from the selected file. */
  rawRows?: string[][];
  rawSheetName?: string;
  rawTruncated?: boolean;
  rawTotalRows?: number;
  confirming: boolean;
  confirmError?: string | null;
  confirmLabel?: string;
  confirmingLabel?: string;
  onReupload: () => void;
  onConfirm: () => void;
  onClose: () => void;
};

function formatFileSizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReportUploadReviewModal({
  filename,
  subtitle,
  fileSizeLabel,
  lineItems,
  currencyCode,
  side,
  rawRows,
  rawSheetName,
  rawTruncated,
  rawTotalRows,
  confirming,
  confirmError,
  confirmLabel = "Confirm upload",
  confirmingLabel = "Uploading…",
  onReupload,
  onConfirm,
  onClose,
}: ReportUploadReviewModalProps) {
  const showRaw = Boolean(rawRows && rawRows.length > 0);
  const headerCells = showRaw ? (rawRows?.[0] ?? []) : [];
  const bodyRows = showRaw ? (rawRows ?? []).slice(1) : [];
  const columnCount = showRaw
    ? Math.max(
        headerCells.length,
        ...bodyRows.map((row) => row.length),
        1,
      )
    : 0;
  const dataRowCount =
    typeof rawTotalRows === "number"
      ? Math.max(rawTotalRows - 1, 0)
      : bodyRows.length;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !confirming) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirming, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <LoadingOverlay
        active={confirming}
        label={confirmingLabel}
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px]"
      >
        <div
          className="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-upload-review-title"
        >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2
              id="report-upload-review-title"
              className="text-lg font-semibold tracking-tight text-foreground"
            >
              Confirm report upload
            </h2>
            <p className="mt-1 text-sm text-foreground-muted">
              {showRaw
                ? "Review the file you selected before uploading."
                : "Review the parsed data before submitting."}{" "}
              <span className="font-medium text-foreground">{filename}</span>
              {fileSizeLabel ? (
                <span className="text-foreground-subtle"> · {fileSizeLabel}</span>
              ) : null}
            </p>
            {subtitle ? (
              <p className="mt-1 text-sm text-foreground-subtle">{subtitle}</p>
            ) : null}
          </div>
          <ModalCloseButton onClick={onClose} disabled={confirming} />
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-6 py-4">
          {showRaw ? (
            <>
              <p className="mb-3 text-sm text-foreground-muted">
                Sheet “{rawSheetName ?? "Sheet1"}”
                {` · ${dataRowCount} data row${dataRowCount === 1 ? "" : "s"}`}
                {rawTruncated
                  ? " · preview shows the first rows only"
                  : null}
              </p>
              <div className="overflow-x-auto rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)]">
                <DataTable className="min-w-max">
                  <DataTableHead>
                    <tr>
                      <DataTableTh className="sticky left-0 z-10 w-12 bg-surface">
                        #
                      </DataTableTh>
                      {Array.from({ length: columnCount }, (_, index) => (
                        <DataTableTh key={index} className="whitespace-nowrap">
                          {headerCells[index]?.trim() || ""}
                        </DataTableTh>
                      ))}
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {bodyRows.map((row, rowIndex) => (
                      <DataTableRow key={rowIndex}>
                        <DataTableTd className="sticky left-0 z-10 bg-surface text-foreground-subtle">
                          {rowIndex + 1}
                        </DataTableTd>
                        {Array.from({ length: columnCount }, (_, colIndex) => (
                          <DataTableTd
                            key={colIndex}
                            className="whitespace-nowrap text-foreground-muted"
                          >
                            <span title={row[colIndex] ?? ""}>
                              {row[colIndex] ?? ""}
                            </span>
                          </DataTableTd>
                        ))}
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-foreground-muted">
                {lineItems?.length ?? 0} line item
                {(lineItems?.length ?? 0) === 1 ? "" : "s"}
              </p>
              <ReportLineItemsTable
                lineItems={lineItems ?? []}
                currencyCode={currencyCode}
                side={side}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          {confirmError ? (
            <p className={`mr-auto w-full ${ui.alertError}`}>{confirmError}</p>
          ) : null}
          <Button variant="secondary" onClick={onReupload} disabled={confirming}>
            Choose different file
          </Button>
          <Button onClick={onConfirm} disabled={confirming}>
            {confirming ? confirmingLabel : confirmLabel}
          </Button>
        </div>
        </div>
      </LoadingOverlay>
    </div>
  );
}

export { formatFileSizeLabel };
