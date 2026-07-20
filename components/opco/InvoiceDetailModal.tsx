"use client";

import Link from "next/link";

import { DizleeOpcoInvoiceDocument } from "@/components/shared/dizlee-opco-invoice-document";
import { ModalCloseButton } from "@/components/ui/modal-close-button";
import type { OpcoInvoiceDetail } from "@/lib/opco/queries/invoices";

type InvoiceDetailModalProps = {
  detail: OpcoInvoiceDetail | null;
  loading: boolean;
  justAcknowledged: boolean;
  onClose: () => void;
};

export function InvoiceDetailModal({
  detail,
  loading,
  justAcknowledged,
  onClose,
}: InvoiceDetailModalProps) {
  if (!detail && !loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div
        className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-border bg-surface shadow-[var(--shadow-md)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4 print:hidden">
          <div>
            <h2 id="invoice-detail-title" className="text-lg font-semibold text-foreground">
              Invoice
            </h2>
            {detail ? (
              <p className="mt-1 text-sm text-foreground-muted">
                {detail.statusLabel} · {detail.paymentStatusLabel} · {detail.periodLabel}
              </p>
            ) : null}
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>

        <div className="overflow-y-auto px-6 py-5 sm:px-8">
          {loading ? (
            <p className="text-sm text-foreground-subtle">Loading invoice details…</p>
          ) : detail ? (
            <div className="space-y-4">
              {justAcknowledged ? (
                <p className="rounded border border-success-border bg-success-muted px-4 py-3 text-sm text-success print:hidden">
                  Invoice acknowledged on first view.
                </p>
              ) : null}

              <DizleeOpcoInvoiceDocument
                invoiceNumber={detail.invoiceNumber ?? `Invoice #${detail.id}`}
                issuedAt={detail.issuedAt}
                billedPartyName={detail.opcoName}
                currencyCode={detail.currencyCode}
                lineItems={detail.lineItems}
                bankDetails={detail.bankDetails}
                preparedBy={detail.preparedBy}
                approvedBy={detail.approvedBy}
              />
            </div>
          ) : null}
        </div>

        {detail ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4 print:hidden">
            <p className="text-sm text-foreground-muted">
              Acknowledged:{" "}
              {detail.acknowledgedAt
                ? new Date(detail.acknowledgedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Not yet"}
            </p>
            <Link
              href={`/opco/invoices/${detail.id}/print`}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Print invoice
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
