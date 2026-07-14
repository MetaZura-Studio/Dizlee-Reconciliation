"use client";

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
import type { InvoiceBankDetails } from "@/lib/dizlee/invoice-bank-details";
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

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);
}

function BankDetailsBlock({ details }: { details: InvoiceBankDetails }) {
  return (
    <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
      {details.bankName ? (
        <div>
          <dt className="text-foreground-subtle">Bank</dt>
          <dd className="text-foreground">{details.bankName}</dd>
        </div>
      ) : null}
      {details.accountName ? (
        <div>
          <dt className="text-foreground-subtle">Account name</dt>
          <dd className="text-foreground">{details.accountName}</dd>
        </div>
      ) : null}
      {details.accountNumber ? (
        <div>
          <dt className="text-foreground-subtle">Account number</dt>
          <dd className="text-foreground">{details.accountNumber}</dd>
        </div>
      ) : null}
      {details.iban ? (
        <div>
          <dt className="text-foreground-subtle">IBAN</dt>
          <dd className="text-foreground">{details.iban}</dd>
        </div>
      ) : null}
      {details.swift ? (
        <div>
          <dt className="text-foreground-subtle">SWIFT</dt>
          <dd className="text-foreground">{details.swift}</dd>
        </div>
      ) : null}
      {details.reference ? (
        <div className="sm:col-span-2">
          <dt className="text-foreground-subtle">Payment reference</dt>
          <dd className="text-foreground">{details.reference}</dd>
        </div>
      ) : null}
    </dl>
  );
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
  if (!detail && !loading) {
    return null;
  }

  return (
    <Modal
      open={!!detail || loading}
      title="Invoice details"
      onClose={onClose}
      wide
      className="max-w-2xl"
    >
      {loading ? (
        <p className="text-sm text-foreground-subtle">Loading invoice details…</p>
      ) : detail ? (
        <div className="space-y-6">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-foreground-subtle">Invoice number</dt>
              <dd className="font-medium text-foreground">
                {detail.invoiceNumber ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Period</dt>
              <dd className="font-medium text-foreground">{detail.period.label}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Direction</dt>
              <dd className="font-medium text-foreground">{detail.direction}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">OpCo</dt>
              <dd className="font-medium text-foreground">{detail.opcoName}</dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Partner</dt>
              <dd className="font-medium text-foreground">
                {detail.partnerName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-foreground-subtle">Uploaded</dt>
              <dd className="font-medium text-foreground">
                {formatDateTime(detail.uploadedAt)}
              </dd>
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
                  {formatDateTime(detail.acknowledgedAt)}
                </dd>
              </div>
            ) : null}
            {detail.paidAt ? (
              <div>
                <dt className="text-foreground-subtle">Paid</dt>
                <dd className="font-medium text-foreground">
                  {formatDateTime(detail.paidAt)}
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-foreground-subtle">Total</dt>
              <dd className="font-medium text-foreground">
                {formatMoney(detail.totalAmount, detail.currencyCode)}
              </dd>
            </div>
          </dl>

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
            ) : detail.isDigital ? (
              detail.bankDetails ? (
                <div className="mt-2 rounded-md border border-border bg-surface-muted p-3">
                  <p className="text-sm font-medium text-foreground">
                    Digital invoice — payment details
                  </p>
                  <BankDetailsBlock details={detail.bankDetails} />
                </div>
              ) : (
                <p className="mt-2 text-sm text-foreground-subtle">
                  Digital invoice created. Bank details will appear when configured
                  in admin settings.
                </p>
              )
            ) : (
              <p className="mt-2 text-sm text-foreground-subtle">No file attached.</p>
            )}
          </div>

          {detail.lineItems.length > 0 ? (
            <div>
              <h3 className="text-sm font-medium text-foreground-muted">Line items</h3>
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
                        <DataTableRow key={`${item.description}-${item.lineTotal}`}>
                          <DataTableTd>{item.description}</DataTableTd>
                          <DataTableTd align="right" className="text-foreground-muted">
                            {item.quantity}
                          </DataTableTd>
                          <DataTableTd align="right" className="text-foreground-muted">
                            {formatMoney(item.unitPrice, detail.currencyCode)}
                          </DataTableTd>
                          <DataTableTd align="right" className="text-foreground-muted">
                            {formatMoney(item.lineTotal, detail.currencyCode)}
                          </DataTableTd>
                        </DataTableRow>
                      ))}
                    </tbody>
                  </DataTable>
                </DataTableFrame>
              </div>
            </div>
          ) : null}

          {detail.canMarkPayment && onMarkPayment ? (
            <div className="border-t border-border pt-4">
              {actionError ? (
                <p className={`mb-3 ${ui.alertError}`}>{actionError}</p>
              ) : null}
              <Button
                disabled={actionLoading}
                onClick={() => {
                  if (
                    window.confirm(
                      "Mark this invoice as paid? This records payment collection from the OpCo.",
                    )
                  ) {
                    onMarkPayment(detail.id);
                  }
                }}
              >
                {actionLoading ? "Saving…" : "Mark payment done"}
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
