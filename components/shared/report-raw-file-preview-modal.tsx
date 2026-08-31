/**
 * Read-only modal showing the original uploaded Excel as a raw sheet grid.
 */

"use client";

import { useEffect } from "react";

import {
  DataTable,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { LoadingOverlay } from "@/components/ui/loading";
import {
  formatPreviewCellValue,
  LocalizedCellText,
  previewCellAlign,
} from "@/lib/ui/arabic-text";
import {
  reportPreviewBackdropClass,
  reportPreviewBodyClass,
  reportPreviewShellClasses,
  reportPreviewTableScrollClass,
} from "@/lib/ui/report-preview-modal";

type ReportRawFilePreviewModalProps = {
  filename: string;
  subtitle?: string;
  downloadHref?: string;
  loading: boolean;
  error?: string | null;
  rawRows: string[][];
  sheetName?: string | null;
  truncated?: boolean;
  totalRows?: number | null;
  onClose: () => void;
};

export function ReportRawFilePreviewModal({
  filename,
  subtitle,
  downloadHref,
  loading,
  error,
  rawRows,
  sheetName,
  truncated,
  totalRows,
  onClose,
}: ReportRawFilePreviewModalProps) {
  const headerCells = rawRows[0] ?? [];
  const bodyRows = rawRows.slice(1);
  const columnCount = Math.max(
    headerCells.length,
    ...bodyRows.map((row) => row.length),
    1,
  );
  const dataRowCount =
    typeof totalRows === "number"
      ? Math.max(totalRows - 1, 0)
      : bodyRows.length;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className={reportPreviewBackdropClass}>
      <LoadingOverlay
        active={loading}
        label="Loading raw file…"
        className={reportPreviewShellClasses(
          loading || rawRows.length === 0 ? null : columnCount,
          "overflow-hidden",
        )}
      >
        <div
          className="flex h-full w-full flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-raw-file-preview-title"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-3">
            <div className="min-w-0">
              <h2
                id="report-raw-file-preview-title"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                Raw uploaded file
              </h2>
              <p className="mt-0.5 truncate text-sm text-foreground-muted">
                <span className="font-medium text-foreground">{filename}</span>
                {subtitle ? (
                  <span className="text-foreground-subtle"> · {subtitle}</span>
                ) : null}
                {downloadHref ? (
                  <>
                    {" · "}
                    <a
                      href={downloadHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      Download
                    </a>
                  </>
                ) : null}
              </p>
            </div>
            <ModalCloseButton onClick={onClose} />
          </div>

          <div className={reportPreviewBodyClass}>
            {error ? (
              <p className="text-sm text-danger">{error}</p>
            ) : !loading && rawRows.length === 0 ? (
              <p className="text-sm text-foreground-muted">
                No sheet data to display.
              </p>
            ) : !loading ? (
              <>
                <p className="mb-2 shrink-0 text-sm text-foreground-muted">
                  Sheet “{sheetName ?? "Sheet1"}”
                  {` · ${dataRowCount} data row${dataRowCount === 1 ? "" : "s"}`}
                  {truncated
                    ? " · preview shows the first rows only"
                    : null}
                </p>
                <div className={reportPreviewTableScrollClass}>
                  <DataTable className="min-w-max">
                    <DataTableHead>
                      <tr>
                        <DataTableTh
                          align="center"
                          className="sticky left-0 top-0 z-20 w-12 bg-surface"
                        >
                          #
                        </DataTableTh>
                        {Array.from({ length: columnCount }, (_, index) => {
                          const headerText = headerCells[index]?.trim() || "";
                          const display = formatPreviewCellValue(headerText);
                          return (
                            <DataTableTh
                              key={index}
                              align={previewCellAlign(headerText)}
                              className="sticky top-0 z-10 whitespace-nowrap bg-surface"
                            >
                              <LocalizedCellText>{display}</LocalizedCellText>
                            </DataTableTh>
                          );
                        })}
                      </tr>
                    </DataTableHead>
                    <tbody>
                      {bodyRows.map((row, rowIndex) => (
                        <DataTableRow key={rowIndex}>
                          <DataTableTd
                            align="center"
                            className="sticky left-0 z-10 bg-surface text-foreground-subtle"
                          >
                            {rowIndex + 1}
                          </DataTableTd>
                          {Array.from({ length: columnCount }, (_, colIndex) => {
                            const cellValue = row[colIndex] ?? "";
                            const display = formatPreviewCellValue(cellValue);
                            return (
                              <DataTableTd
                                key={colIndex}
                                align={previewCellAlign(cellValue)}
                                className="whitespace-nowrap text-foreground-muted"
                              >
                                <LocalizedCellText title={cellValue}>
                                  {display}
                                </LocalizedCellText>
                              </DataTableTd>
                            );
                          })}
                        </DataTableRow>
                      ))}
                    </tbody>
                  </DataTable>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </LoadingOverlay>
    </div>
  );
}
