import { LocalizedCellText } from "@/lib/ui/arabic-text";
import { formatMoney } from "@/lib/platform/format-money";
import type { ReportPreviewLineItem } from "@/lib/platform/report-preview";
import type { ReportUploaderSide } from "@/lib/platform/reports/sides";

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
      <table className="w-full table-fixed divide-y divide-border text-sm">
        <colgroup>
          <col className="w-1/3" />
          <col className="w-1/3" />
          <col className="w-1/3" />
        </colgroup>
        <thead className="bg-surface-muted text-foreground-muted">
          <tr>
            <th className="px-4 py-3 text-center font-medium">#</th>
            <th className="px-4 py-3 text-left font-medium">Service name</th>
            <th className="px-4 py-3 text-right font-medium">Amount (USD)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lineItems.map((item, index) => (
            <tr key={`${item.lineNumber}-${index}`}>
              <td className="px-4 py-3 text-center tabular-nums text-foreground-subtle">
                {item.lineNumber}
              </td>
              <td className="truncate px-4 py-3 text-left text-foreground">
                <LocalizedCellText>{item.description ?? "—"}</LocalizedCellText>
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-foreground-muted">
                {displayMoney(item.amountUsd ?? item.amount, "USD")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const localIso = currencyCode?.trim() || "USD";
  const localLabel = currencyCode
    ? `Amount (${currencyCode})`
    : "Amount (local)";

  return (
    <table className="w-full table-fixed divide-y divide-border text-sm">
      <colgroup>
        <col className="w-1/5" />
        <col className="w-1/5" />
        <col className="w-1/5" />
        <col className="w-1/5" />
        <col className="w-1/5" />
      </colgroup>
      <thead className="bg-surface-muted text-foreground-muted">
        <tr>
          <th className="px-4 py-3 text-center font-medium">#</th>
          <th className="px-4 py-3 text-left font-medium">Description</th>
          <th className="px-4 py-3 text-right font-medium">{localLabel}</th>
          <th className="px-4 py-3 text-right font-medium">USD rate</th>
          <th className="px-4 py-3 text-right font-medium">Amount (USD)</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {lineItems.map((item, index) => (
          <tr key={`${item.lineNumber}-${index}`}>
            <td className="px-4 py-3 text-center tabular-nums text-foreground-subtle">
              {item.lineNumber}
            </td>
            <td className="truncate px-4 py-3 text-left text-foreground">
              <LocalizedCellText>{item.description ?? "—"}</LocalizedCellText>
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-foreground-muted">
              {displayMoney(item.amount, localIso)}
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-foreground-muted">
              {item.exchangeRate ?? "—"}
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-foreground-muted">
              {displayMoney(item.amountUsd, "USD")}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
