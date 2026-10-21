/**
 * Read-only modal showing the original uploaded Excel as a raw sheet grid.
 */

"use client";

import { useEffect, type ReactNode } from "react";

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
  title?: string;
  filename: string;
  subtitle?: string;
  downloadHref?: string;
  loading: boolean;
  error?: string | null;
  /** Excel grid preview (omit when `pdfUrl` is set). */
  rawRows?: string[][];
  sheetName?: string | null;
  truncated?: boolean;
  totalRows?: number | null;
  /** PDF blob/object URL — shown in an iframe instead of the sheet grid. */
  pdfUrl?: string | null;
  /** Optional actions below the sheet (e.g. Confirm send). */
  footer?: ReactNode;
  onClose: () => void;
};

export function ReportRawFilePreviewModal({
  title = "Raw uploaded file",
  filename,
  subtitle,
  downloadHref,
  loading,
  error,
  rawRows = [],
  sheetName,
  truncated,
  totalRows,
  pdfUrl,
  footer,
  onClose,
}: ReportRawFilePreviewModalProps) {
  const isPdf = Boolean(pdfUrl);
  /** Hide viewer chrome; page-width zoom so the report fills the wide modal. */
  const embedPdfUrl =
    pdfUrl && !pdfUrl.includes("#")
      ? `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=page-width`
      : pdfUrl;
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
        label={isPdf ? "Loading PDF…" : "Loading raw file…"}
        className={
          isPdf
            ? "flex h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-border bg-white shadow-[var(--shadow-md)] sm:h-[90vh]"
            : reportPreviewShellClasses(
                loading || rawRows.length === 0 ? null : columnCount,
                "overflow-hidden",
              )
        }
      >
        <div
          className="flex h-full w-full flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-raw-file-preview-title"
        >
          {isPdf ? (
            <div className="flex shrink-0 items-center justify-end bg-white px-4 py-2">
              <h2 id="report-raw-file-preview-title" className="sr-only">
                {title}
              </h2>
              <ModalCloseButton onClick={onClose} />
            </div>
          ) : (
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-3">
              <div className="min-w-0">
                <h2
                  id="report-raw-file-preview-title"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  {title}
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
          )}

          <div
            className={
              isPdf
                ? "min-h-0 flex-1 overflow-y-auto bg-white p-0"
                : reportPreviewBodyClass
            }
          >
            {error ? (
              <p className="shrink-0 px-5 py-3 text-sm text-danger">{error}</p>
            ) : null}
            {!loading && isPdf && embedPdfUrl ? (
              // Tall A4-ratio frame at modal width → native viewer scales page large.
              <iframe
                title={filename}
                src={embedPdfUrl}
                className="block w-full border-0 bg-white"
                style={{ height: "calc(min(100vw, 64rem) * 297 / 210)" }}
              />
            ) : null}
            {!error && !loading && !isPdf && rawRows.length === 0 ? (
              <p className="text-sm text-foreground-muted">
                No sheet data to display.
              </p>
            ) : null}
            {!error && !loading && !isPdf && rawRows.length > 0 ? (
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

          {footer ? (
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </LoadingOverlay>
    </div>
  );
}
