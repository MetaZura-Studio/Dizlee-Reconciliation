"use client";

import type { InvoiceDetail } from "@/lib/dizlee/invoices";

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

type InvoiceDetailModalProps = {
  detail: InvoiceDetail | null;
  loading: boolean;
  onClose: () => void;
};

export function InvoiceDetailModal({
  detail,
  loading,
  onClose,
}: InvoiceDetailModalProps) {
  if (!detail && !loading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-detail-title"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="invoice-detail-title" className="text-lg font-semibold text-zinc-900">
            Invoice details
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            Close
          </button>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading invoice details…</p>
        ) : detail ? (
          <div className="mt-4 space-y-6">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-zinc-500">Invoice number</dt>
                <dd className="font-medium text-zinc-900">
                  {detail.invoiceNumber ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Period</dt>
                <dd className="font-medium text-zinc-900">{detail.period.label}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Direction</dt>
                <dd className="font-medium text-zinc-900">{detail.direction}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">OpCo</dt>
                <dd className="font-medium text-zinc-900">{detail.opcoName}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Partner</dt>
                <dd className="font-medium text-zinc-900">
                  {detail.partnerName ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Uploaded</dt>
                <dd className="font-medium text-zinc-900">
                  {formatDateTime(detail.uploadedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Invoice status</dt>
                <dd className="font-medium text-zinc-900">{detail.invoiceStatus}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Payment status</dt>
                <dd className="font-medium text-zinc-900">{detail.paymentStatus}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-zinc-500">Total</dt>
                <dd className="font-medium text-zinc-900">
                  {formatMoney(detail.totalAmount, detail.currencyCode)}
                </dd>
              </div>
            </dl>

            <div>
              <h3 className="text-sm font-medium text-zinc-700">Preview</h3>
              {detail.previewUrl ? (
                <p className="mt-2 text-sm text-zinc-600">
                  {detail.filename ?? "Uploaded file"}{" "}
                  <span className="text-zinc-400">
                    ({formatBytes(detail.fileSizeBytes)})
                  </span>{" "}
                  <a
                    href={detail.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-zinc-700 underline hover:text-zinc-900"
                  >
                    Open file
                  </a>
                </p>
              ) : detail.isDigital ? (
                <p className="mt-2 text-sm text-zinc-500">
                  Digital invoice preview will be available when Dizlee invoice
                  creation is implemented.
                </p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">No file attached.</p>
              )}
            </div>

            {detail.lineItems.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-zinc-700">Line items</h3>
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200">
                  <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-zinc-600">
                          Description
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-zinc-600">
                          Qty
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-zinc-600">
                          Unit price
                        </th>
                        <th className="px-3 py-2 text-right font-medium text-zinc-600">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 bg-white">
                      {detail.lineItems.map((item) => (
                        <tr key={`${item.description}-${item.lineTotal}`}>
                          <td className="px-3 py-2 text-zinc-900">
                            {item.description}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-600">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-600">
                            {formatMoney(item.unitPrice, detail.currencyCode)}
                          </td>
                          <td className="px-3 py-2 text-right text-zinc-600">
                            {formatMoney(item.lineTotal, detail.currencyCode)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
