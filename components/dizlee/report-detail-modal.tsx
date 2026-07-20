"use client";

import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { ReportFilenameLink } from "@/components/shared/report-filename-link";
import type { ReportDetail } from "@/lib/dizlee/reports";

function formatBytes(size: number | null): string {
  if (size === null) {
    return "—";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type ReportDetailModalProps = {
  detail: ReportDetail | null;
  loading: boolean;
  onClose: () => void;
};

export function ReportDetailModal({
  detail,
  loading,
  onClose,
}: ReportDetailModalProps) {
  if (!detail && !loading) {
    return null;
  }

  return (
    <Modal
      open={!!detail || loading}
      title="Parsed report data"
      onClose={onClose}
      wide
      className="max-w-6xl"
    >
      {loading ? (
        <p className="text-sm text-foreground-subtle">Loading report details…</p>
      ) : detail ? (
        <div className="space-y-6">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-foreground-subtle">Period</dt>
              <dd className="font-medium text-foreground">{detail.period.label}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">OpCo / Partner</dt>
              <dd className="font-medium text-foreground">{detail.lane}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Uploaded by</dt>
              <dd className="font-medium text-foreground">{detail.uploadedBy}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Upload timestamp</dt>
              <dd className="font-medium text-foreground">
                {formatDateTime(detail.uploadedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Original file</dt>
              <dd className="font-medium text-foreground">
                <ReportFilenameLink
                  filename={detail.filename}
                  href={detail.previewUrl ?? undefined}
                />
              </dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">File size</dt>
              <dd className="font-medium text-foreground">
                {formatBytes(detail.fileSizeBytes)}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Status</dt>
              <dd className="font-medium text-foreground">{detail.status}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Line items</dt>
              <dd className="font-medium text-foreground">{detail.lineItemCount}</dd>
            </div>
          </dl>

          <div>
            <h3 className="text-sm font-semibold text-foreground">Parsed report data</h3>
            <div className="mt-3">
              {detail.lineItems.length === 0 ? (
                <p className="rounded-2xl border border-border bg-surface-muted px-3 py-4 text-sm text-foreground-subtle">
                  No line items found in this report.
                </p>
              ) : (
                <DataTableFrame>
                  <DataTable>
                    <DataTableHead>
                      <DataTableRow>
                        <DataTableTh>#</DataTableTh>
                        <DataTableTh>Description</DataTableTh>
                        <DataTableTh>Usage</DataTableTh>
                        <DataTableTh>USD</DataTableTh>
                        <DataTableTh>Amount</DataTableTh>
                        <DataTableTh>Rate</DataTableTh>
                        <DataTableTh>Unit</DataTableTh>
                        <DataTableTh>Basis</DataTableTh>
                      </DataTableRow>
                    </DataTableHead>
                    <tbody>
                      {detail.lineItems.map((item, index) => (
                        <DataTableRow key={`${item.lineNumber}-${index}`}>
                          <DataTableTd className="text-foreground-subtle">
                            {item.lineNumber}
                          </DataTableTd>
                          <DataTableTd>{item.description ?? "—"}</DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {item.usageAmount ?? "—"}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {item.usageUsd ?? "—"}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {item.amount ?? "—"}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {item.exchangeRate ?? "—"}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {item.usageUnit ?? "—"}
                          </DataTableTd>
                          <DataTableTd className="text-foreground-muted">
                            {item.reconciliationBasis ?? "—"}
                          </DataTableTd>
                        </DataTableRow>
                      ))}
                    </tbody>
                  </DataTable>
                </DataTableFrame>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
