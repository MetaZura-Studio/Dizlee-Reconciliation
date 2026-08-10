import { DizleeLogo } from "@/components/brand/dizlee-logo";
import type { InvoiceBankDetails } from "@/lib/dizlee/invoice-bank-details";
import { cn } from "@/lib/ui/classes";

export type DizleeOpcoInvoiceLine = {
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal?: number;
};

export type DizleeOpcoInvoiceDocumentProps = {
  invoiceNumber: string;
  issuedAt: string;
  billedPartyName: string;
  currencyCode: string;
  lineItems: DizleeOpcoInvoiceLine[];
  bankDetails: InvoiceBankDetails | null;
  preparedBy?: string | null;
  approvedBy?: string | null;
  /** Optional banner under the header (e.g. USD equivalent + FX rate). */
  subtitle?: string | null;
  className?: string;
};

function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`;
  }
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-US", { dateStyle: "long" });
}

function lineTotalOf(item: DizleeOpcoInvoiceLine): number {
  if (typeof item.lineTotal === "number" && Number.isFinite(item.lineTotal)) {
    return item.lineTotal;
  }
  return item.quantity * item.unitPrice;
}

function BankRows({ details }: { details: InvoiceBankDetails }) {
  const rows: Array<{ label: string; value: string; wide?: boolean }> = [];
  if (details.bankName) {
    rows.push({ label: "Bank name", value: details.bankName });
  }
  if (details.accountName) {
    rows.push({ label: "Account name", value: details.accountName });
  }
  if (details.accountNumber) {
    rows.push({ label: "Account number", value: details.accountNumber });
  }
  if (details.iban) {
    rows.push({ label: "IBAN", value: details.iban, wide: true });
  }
  if (details.swift) {
    rows.push({ label: "SWIFT", value: details.swift });
  }
  if (details.reference) {
    rows.push({ label: "Reference", value: details.reference });
  }

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-600">No bank details on file.</p>;
  }

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn("min-w-0", row.wide && "sm:col-span-2")}
        >
          <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            {row.label}
          </dt>
          <dd className="mt-0.5 break-all text-zinc-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Printable Dizlee → OpCo invoice layout (preview + OpCo print).
 */
export function DizleeOpcoInvoiceDocument({
  invoiceNumber,
  issuedAt,
  billedPartyName,
  currencyCode,
  lineItems,
  bankDetails,
  preparedBy,
  approvedBy,
  subtitle,
  className,
}: DizleeOpcoInvoiceDocumentProps) {
  const total = lineItems.reduce((sum, item) => sum + lineTotalOf(item), 0);
  const preparedLabel = preparedBy?.trim() || null;
  const approvedLabel = approvedBy?.trim() || null;

  return (
    <article
      className={cn(
        "space-y-5 bg-white text-zinc-900 print:bg-white",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-zinc-900 pb-5">
        <div>
          <DizleeLogo className="h-10" />
          {subtitle ? (
            <p className="mt-2 text-sm font-medium text-zinc-600">{subtitle}</p>
          ) : null}
        </div>
        <div className="min-w-[12rem] text-right text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Invoice number
          </p>
          <p className="text-base font-semibold text-zinc-900">{invoiceNumber}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Date
          </p>
          <p className="text-zinc-800">{formatDate(issuedAt)}</p>
        </div>
      </header>

      <section className="grid grid-cols-1 border border-zinc-900 sm:grid-cols-2">
        <div className="border-zinc-900 p-4 sm:border-r">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Billing party
          </h2>
          <p className="mt-1 text-base font-semibold text-zinc-900">Dizlee</p>
        </div>
        <div className="border-t border-zinc-900 p-4 sm:border-t-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Billed party
          </h2>
          <p className="mt-1 text-base font-semibold text-zinc-900">
            {billedPartyName}
          </p>
        </div>
      </section>

      <section className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse border border-zinc-900 text-sm">
          <thead>
            <tr className="bg-zinc-100 text-left">
              <th className="border border-zinc-900 px-3 py-2.5 font-semibold">
                Item No.
              </th>
              <th className="border border-zinc-900 px-3 py-2.5 font-semibold">
                Description
              </th>
              <th className="border border-zinc-900 px-3 py-2.5 font-semibold text-right">
                Number
              </th>
              <th className="border border-zinc-900 px-3 py-2.5 font-semibold text-right">
                Amount
              </th>
              <th className="border border-zinc-900 px-3 py-2.5 font-semibold text-right">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((item, index) => (
              <tr key={`${item.description}-${index}`}>
                <td className="border border-zinc-900 px-3 py-2.5 text-zinc-700">
                  {index + 1}
                </td>
                <td className="border border-zinc-900 px-3 py-2.5 text-zinc-900">
                  {item.description || "—"}
                </td>
                <td className="border border-zinc-900 px-3 py-2.5 text-right text-zinc-700">
                  {item.quantity}
                </td>
                <td className="border border-zinc-900 px-3 py-2.5 text-right text-zinc-700">
                  {formatMoney(item.unitPrice, currencyCode)}
                </td>
                <td className="border border-zinc-900 px-3 py-2.5 text-right text-zinc-900">
                  {formatMoney(lineTotalOf(item), currencyCode)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td
                colSpan={4}
                className="border border-zinc-900 px-3 py-2.5 text-right font-semibold"
              >
                Total
              </td>
              <td className="border border-zinc-900 px-3 py-2.5 text-right text-base font-semibold">
                {formatMoney(total, currencyCode)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      <section className="border border-zinc-900 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Bank details
        </h2>
        <div className="mt-3">
          {bankDetails ? (
            <BankRows details={bankDetails} />
          ) : (
            <p className="text-sm text-zinc-600">No bank details on file.</p>
          )}
        </div>
      </section>

      <section className="space-y-5 text-sm text-zinc-700">
        <p>
          Please credit the above bank account for the total amount due. Use the
          invoice number as the payment reference where possible.
        </p>
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="font-medium text-zinc-900">Prepared by</p>
            {preparedLabel ? (
              <p className="mt-3 text-zinc-900">{preparedLabel}</p>
            ) : null}
            <div
              className={cn(
                "border-b border-zinc-400",
                preparedLabel ? "mt-6" : "mt-10",
              )}
            />
          </div>
          <div>
            <p className="font-medium text-zinc-900">Approved by</p>
            {approvedLabel ? (
              <p className="mt-3 text-zinc-900">{approvedLabel}</p>
            ) : null}
            <div
              className={cn(
                "border-b border-zinc-400",
                approvedLabel ? "mt-6" : "mt-10",
              )}
            />
          </div>
        </div>
      </section>
    </article>
  );
}
