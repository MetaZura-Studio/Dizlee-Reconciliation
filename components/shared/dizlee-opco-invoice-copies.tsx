/**
 * Renders Dizlee → OpCo digital invoice: local page, plus optional USD page.
 * Used by create preview, detail modals, and print views.
 */

"use client";

import {
  DizleeOpcoInvoiceDocument,
  type DizleeOpcoInvoiceDocumentProps,
  type DizleeOpcoInvoiceLine,
} from "@/components/shared/dizlee-opco-invoice-document";
import { convertInvoiceLinesToUsd } from "@/lib/dizlee/invoice-usd-copy";

export type DizleeOpcoInvoiceCopiesProps = Omit<
  DizleeOpcoInvoiceDocumentProps,
  "subtitle" | "className"
> & {
  includeUsdCopy?: boolean;
  usdFxRate?: number | null;
  /** Kept for callers; FX rate is not shown on the invoice pages. */
  periodLabel?: string | null;
  className?: string;
};

export function DizleeOpcoInvoiceCopies({
  includeUsdCopy = false,
  usdFxRate = null,
  periodLabel: _periodLabel = null,
  className,
  ...documentProps
}: DizleeOpcoInvoiceCopiesProps) {
  void _periodLabel;
  const showUsd =
    includeUsdCopy &&
    documentProps.currencyCode !== "USD" &&
    usdFxRate !== null &&
    Number.isFinite(usdFxRate) &&
    usdFxRate > 0;

  const usdLines: DizleeOpcoInvoiceLine[] | null = showUsd
    ? convertInvoiceLinesToUsd(documentProps.lineItems, usdFxRate as number)
    : null;

  return (
    <div className={className ? `space-y-0 ${className}` : "space-y-0"}>
      <section className="rounded-lg border-2 border-zinc-900 bg-white p-4 sm:p-6 print:rounded-none print:border-0 print:p-0">
        {showUsd ? (
          <div className="mb-4 border-b-2 border-zinc-900 pb-3 print:mb-5">
            <p className="text-base font-semibold text-zinc-900">
              Invoice (Local Currency)
            </p>
          </div>
        ) : null}
        <DizleeOpcoInvoiceDocument {...documentProps} />
      </section>

      {usdLines ? (
        <>
          <div
            className="my-6 flex items-center gap-3 print:hidden"
            aria-hidden
          >
            <div className="h-px flex-1 bg-zinc-900" />
            <span className="shrink-0 rounded-full border border-zinc-900 bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-800">
              Next: Invoice (USD)
            </span>
            <div className="h-px flex-1 bg-zinc-900" />
          </div>

          <section className="rounded-lg border-2 border-zinc-900 bg-white p-4 sm:p-6 print:break-before-page print:rounded-none print:border-0 print:p-0">
            <div className="mb-4 border-b-2 border-zinc-900 pb-3 print:mb-5">
              <p className="text-base font-semibold text-zinc-900">
                Invoice (USD)
              </p>
            </div>
            <DizleeOpcoInvoiceDocument
              {...documentProps}
              currencyCode="USD"
              lineItems={usdLines}
            />
          </section>
        </>
      ) : null}
    </div>
  );
}
