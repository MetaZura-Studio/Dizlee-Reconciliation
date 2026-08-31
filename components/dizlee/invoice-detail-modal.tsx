"use client";

import { formatAppDateTime } from "@/lib/platform/format-datetime";
import Link from "next/link";
import { useState } from "react";

import { DizleeOpcoInvoiceDocument } from "@/components/shared/dizlee-opco-invoice-document";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableFrame,
  DataTableHead,
  DataTableRow,
  DataTableTd,
  DataTableTh,
} from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusPill } from "@/components/ui/status-pill";
import type { InvoiceDetail } from "@/lib/dizlee/invoices";
import { formatMoney } from "@/lib/platform/format-money";
import { ui } from "@/lib/ui/classes";
import { invoiceStatusTone, paymentLabelTone } from "@/lib/ui/status-tones";

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

type InvoiceDetailModalProps = {
  detail: InvoiceDetail | null;
  loading: boolean;
  actionLoading?: boolean;
  actionError?: string | null;
  onClose: () => void;
  onMarkPayment?: (invoiceId: string) => void;
};

export function InvoiceDetailModal({
  detail,
  loading,
  actionLoading = false,
  actionError = null,
  onClose,
  onMarkPayment,
}: InvoiceDetailModalProps) {
  const [confirmingPaidId, setConfirmingPaidId] = useState<string | null>(null);
  const confirmingPaid =
    detail != null && confirmingPaidId === detail.id;

  if (!detail && !loading) {
    return null;
  }

  const isDigital = Boolean(detail?.isDigital);
  const detailId = detail?.id;

  return (
    <Modal
      open={!!detail || loading}
      title="Invoice details"
      onClose={() => {
        setConfirmingPaidId(null);
        onClose();
      }}
      wide
      className={isDigital ? "max-w-6xl" : "max-w-2xl"}
    >
      {loading ? (
        <p className="text-sm text-foreground-subtle">Loading invoice details…</p>
      ) : detail ? (
        <div className="space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-foreground-subtle">Direction</dt>
              <dd className="font-medium text-foreground">{detail.direction}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Period</dt>
              <dd className="font-medium text-foreground">{detail.period.label}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Invoice status</dt>
              <dd>
                <StatusPill
                  tone={invoiceStatusTone(detail.invoiceStatus.replaceAll(" ", "_"))}
                >
                  {detail.invoiceStatus}
                </StatusPill>
              </dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Payment status</dt>
              <dd>
                <StatusPill tone={paymentLabelTone(detail.paymentStatus)}>
                  {detail.paymentStatus}
                </StatusPill>
              </dd>
            </div>
            {detail.acknowledgedAt ? (
              <div>
                <dt className="text-foreground-subtle">Acknowledged</dt>
                <dd className="font-medium text-foreground">
                  {formatAppDateTime(detail.acknowledgedAt)}
                </dd>
              </div>
            ) : null}
            {detail.paidAt ? (
              <div>
                <dt className="text-foreground-subtle">Paid</dt>
                <dd className="font-medium text-foreground">
                  {formatAppDateTime(detail.paidAt)}
                </dd>
              </div>
            ) : null}
          </dl>

          {detail.isDigital ? (
            <DizleeOpcoInvoiceDocument
              invoiceNumber={detail.invoiceNumber ?? `Invoice #${detail.id}`}
              issuedAt={detail.uploadedAt}
              billedPartyName={detail.opcoName}
              currencyCode={detail.currencyCode}
              lineItems={detail.lineItems}
              bankDetails={detail.bankDetails}
              preparedBy={detail.preparedBy}
              approvedBy={detail.approvedBy}
            />
          ) : (
            <>
              <div>
                <h3 className="text-sm font-medium text-foreground-muted">Preview</h3>
                {detail.previewUrl ? (
                  <p className="mt-2 text-sm text-foreground-muted">
                    {detail.filename ?? "Uploaded file"}{" "}
                    <span className="text-foreground-subtle">
                      ({formatBytes(detail.fileSizeBytes)})
                    </span>{" "}
                    <a
                      href={detail.previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-foreground-muted underline hover:text-foreground"
                    >
                      Open file
                    </a>
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-foreground-subtle">No file attached.</p>
                )}
              </div>

              {detail.lineItems.length > 0 ? (
                <div>
                  <h3 className="text-sm font-medium text-foreground-muted">
                    Line items
                  </h3>
                  <div className="mt-2">
                    <DataTableFrame>
                      <DataTable>
                        <DataTableHead>
                          <DataTableRow>
                            <DataTableTh>Description</DataTableTh>
                            <DataTableTh align="right">Qty</DataTableTh>
                            <DataTableTh align="right">Unit price</DataTableTh>
                            <DataTableTh align="right">Total</DataTableTh>
                          </DataTableRow>
                        </DataTableHead>
                        <tbody>
                          {detail.lineItems.map((item) => (
                            <DataTableRow
                              key={`${item.description}-${item.lineTotal}`}
                            >
                              <DataTableTd>{item.description}</DataTableTd>
                              <DataTableTd
                                align="right"
                                className="text-foreground-muted"
                              >
                                {item.quantity}
                              </DataTableTd>
                              <DataTableTd
                                align="right"
                                className="text-foreground-muted"
                              >
                                {formatMoney(item.unitPrice, detail.currencyCode)}
                              </DataTableTd>
                              <DataTableTd
                                align="right"
                                className="text-foreground-muted"
                              >
                                {formatMoney(item.lineTotal, detail.currencyCode)}
                              </DataTableTd>
                            </DataTableRow>
                          ))}
                        </tbody>
                      </DataTable>
                    </DataTableFrame>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    Total {formatMoney(detail.totalAmount, detail.currencyCode)}
                  </p>
                </div>
              ) : null}
            </>
          )}

          {detail.canMarkPayment && onMarkPayment ? (
            <div className="space-y-3 border-t border-border pt-4">
              {actionError ? (
                <p className={ui.alertError}>{actionError}</p>
              ) : null}
              {confirmingPaid ? (
                <div className="rounded-2xl border border-border bg-surface-muted/70 p-4">
                  <p className="text-sm font-medium text-foreground">
                    Mark this invoice as paid?
                  </p>
                  <p className="mt-1 text-sm text-foreground-muted">
                    {detail.invoiceTypeCode === "PARTNER_TO_CLIENT"
                      ? `This records that Dizlee paid the Partner invoice ${detail.invoiceNumber ?? `#${detail.id}`}.`
                      : `This records payment collection from the OpCo for ${detail.invoiceNumber ?? `invoice #${detail.id}`}.`}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-end gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={actionLoading}
                      onClick={() => setConfirmingPaidId(null)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      disabled={actionLoading || !detailId}
                      onClick={() => {
                        if (!detailId) {
                          return;
                        }
                        onMarkPayment(detailId);
                      }}
                    >
                      {actionLoading ? "Updating…" : "Confirm mark as paid"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setConfirmingPaidId(detail.id)}
                >
                  Mark as paid
                </Button>
              )}
            </div>
          ) : null}

          {detail.isDigital ? (
            <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4 print:hidden">
              <Link
                href={`/dizlee/invoices/${detail.id}/print`}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Print invoice
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
