import type { ReportPreviewLineItem } from "@/lib/platform/report-preview";
import type { ReportUploaderSide } from "@/lib/platform/reports/sides";
import { formatMoney } from "@/lib/platform/format-money";

type ReportLineItemsTableProps = {
  lineItems: ReportPreviewLineItem[];
  currencyCode?: string;
  side?: ReportUploaderSide;
};

function displayMoney(
  raw: string | null | undefined,
  currencyIso: string,
): string {
  if (raw == null || raw === "" || raw === "—") {
    return "—";
  }
  const numeric = Number(String(raw).replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return raw;
  }
  return formatMoney(numeric, currencyIso, { style: "decimal" });
}

export function ReportLineItemsTable({
  lineItems,
  currencyCode,
  side = "opco",
}: ReportLineItemsTableProps) {
  if (lineItems.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-surface-muted px-4 py-5 text-sm text-foreground-subtle">
        No line items found in this report.
      </p>
    );
  }

  if (side === "partner") {
    return (
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-surface-muted text-left text-foreground-muted">
            <tr>
              <th className="px-4 py-3 font-medium">#</th>
              <th className="px-4 py-3 font-medium">Service name</th>
              <th className="px-4 py-3 font-medium">Amount (USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {lineItems.map((item, index) => (
              <tr key={`${item.lineNumber}-${index}`}>
                <td className="px-4 py-3 text-foreground-subtle">
                  {item.lineNumber}
                </td>
                <td className="px-4 py-3 text-foreground">
                  {item.description ?? "—"}
                </td>
                <td className="px-4 py-3 text-foreground-muted">
                  {displayMoney(item.amountUsd ?? item.amount, "USD")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const localIso = currencyCode?.trim() || "USD";
  const localLabel = currencyCode
    ? `Amount (${currencyCode})`
    : "Amount (local)";

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface-muted text-left text-foreground-muted">
          <tr>
            <th className="px-4 py-3 font-medium">#</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">{localLabel}</th>
            <th className="px-4 py-3 font-medium">USD rate</th>
            <th className="px-4 py-3 font-medium">Amount (USD)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lineItems.map((item, index) => (
            <tr key={`${item.lineNumber}-${index}`}>
              <td className="px-4 py-3 text-foreground-subtle">{item.lineNumber}</td>
              <td className="px-4 py-3 text-foreground">{item.description ?? "—"}</td>
              <td className="px-4 py-3 text-foreground-muted">
                {displayMoney(item.amount, localIso)}
                {item.amount && currencyCode ? ` ${currencyCode}` : ""}
              </td>
              <td className="px-4 py-3 text-foreground-muted">
                {item.exchangeRate ?? "—"}
              </td>
              <td className="px-4 py-3 text-foreground-muted">
                {displayMoney(item.amountUsd, "USD")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
