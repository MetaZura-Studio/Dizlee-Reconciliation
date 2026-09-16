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
import { displayPartnerPreviewHeader } from "@/lib/partner/preview-headers";
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
import { ui } from "@/lib/ui/classes";

export type MappedPartnerReviewSummary = {
  partnerId: string;
  partnerName: string;
  lineItemCount: number;
  totalAmount: number;
};

type ReportUploadReviewModalProps = {
  filename: string;
  subtitle?: string;
  fileSizeLabel?: string;
  /** Parsed/mapped line items (legacy confirm flow). */
  lineItems?: ReportPreviewLineItem[];
  /** Hard mapped OpCo partner buckets (preferred confirm summary). */
  mappedPartners?: MappedPartnerReviewSummary[];
  mappedLineItemCount?: number;
  currencyCode?: string | null;
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

function formatAmount(value: number, currencyCode?: string | null): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: currencyCode ? "currency" : "decimal",
      currency: currencyCode || undefined,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}

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
  mappedPartners,
  mappedLineItemCount,
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
  const showMapped = Boolean(mappedPartners && mappedPartners.length > 0);
  const showRaw = !showMapped && Boolean(rawRows && rawRows.length > 0);
  const headerCells = showRaw ? (rawRows?.[0] ?? []) : [];
  const bodyRows = showRaw ? (rawRows ?? []).slice(1) : [];
  const columnCount = showMapped
    ? 3
    : showRaw
      ? Math.max(
          headerCells.length,
          ...bodyRows.map((row) => row.length),
          1,
        )
      : side === "partner"
        ? 3
        : 4;
  const dataRowCount =
    typeof rawTotalRows === "number"
      ? Math.max(rawTotalRows - 1, 0)
      : bodyRows.length;
  const mappedTotalLines =
    mappedLineItemCount ??
    mappedPartners?.reduce((sum, row) => sum + row.lineItemCount, 0) ??
    0;

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
    <div className={reportPreviewBackdropClass}>
      <LoadingOverlay
        active={confirming}
        label={confirmingLabel}
        className={reportPreviewShellClasses(columnCount, "overflow-hidden")}
      >
        <div
          className="flex h-full w-full flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-upload-review-title"
        >
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <h2
                id="report-upload-review-title"
                className="text-base font-semibold tracking-tight text-foreground sm:text-lg"
              >
                Confirm report upload
              </h2>
              <p className="mt-1 text-sm text-foreground-muted">
                {showMapped
                  ? "Review mapped partners before uploading."
                  : showRaw
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

          <div className={reportPreviewBodyClass}>
            {showMapped ? (
              <div className={`${reportPreviewTableScrollClass} p-1`}>
                <p className="mb-3 shrink-0 text-sm text-foreground-muted">
                  {mappedPartners!.length} partner
                  {mappedPartners!.length === 1 ? "" : "s"}
                  {` · ${mappedTotalLines} line item${mappedTotalLines === 1 ? "" : "s"}`}
                </p>
                <DataTable>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>Partner</DataTableTh>
                      <DataTableTh align="right">Line items</DataTableTh>
                      <DataTableTh align="right">Amount</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <tbody>
                    {mappedPartners!.map((partner) => (
                      <DataTableRow key={partner.partnerId}>
                        <DataTableTd>{partner.partnerName}</DataTableTd>
                        <DataTableTd align="right">
                          {partner.lineItemCount}
                        </DataTableTd>
                        <DataTableTd align="right">
                          {formatAmount(partner.totalAmount, currencyCode)}
                        </DataTableTd>
                      </DataTableRow>
                    ))}
                  </tbody>
                </DataTable>
              </div>
            ) : showRaw ? (
              <>
                <p className="mb-2 shrink-0 text-sm text-foreground-muted">
                  Sheet “{rawSheetName ?? "Sheet1"}”
                  {` · ${dataRowCount} data row${dataRowCount === 1 ? "" : "s"}`}
                  {rawTruncated
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
                          const labeled =
                            side === "partner"
                              ? displayPartnerPreviewHeader(headerText)
                              : headerText;
                          const display = formatPreviewCellValue(labeled);
                          return (
                            <DataTableTh
                              key={index}
                              align={previewCellAlign(labeled)}
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
            ) : (
              <div className={`${reportPreviewTableScrollClass} p-1`}>
                <p className="mb-3 shrink-0 text-sm text-foreground-muted">
                  {lineItems?.length ?? 0} line item
                  {(lineItems?.length ?? 0) === 1 ? "" : "s"}
                </p>
                <ReportLineItemsTable
                  lineItems={lineItems ?? []}
                  currencyCode={currencyCode ?? undefined}
                  side={side}
                />
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-border px-5 py-3 sm:px-6 sm:py-4">
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
