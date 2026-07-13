import type { ReportPreviewLineItem } from "@/lib/platform/report-preview";

type ReportLineItemsTableProps = {
  lineItems: ReportPreviewLineItem[];
};

export function ReportLineItemsTable({ lineItems }: ReportLineItemsTableProps) {
  if (lineItems.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface-muted px-3 py-4 text-sm text-foreground-subtle">
        No line items found in this report.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-surface-muted text-left text-foreground-muted">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 font-medium">Usage</th>
            <th className="px-3 py-2 font-medium">USD</th>
            <th className="px-3 py-2 font-medium">Amount</th>
            <th className="px-3 py-2 font-medium">Rate</th>
            <th className="px-3 py-2 font-medium">Unit</th>
            <th className="px-3 py-2 font-medium">Basis</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lineItems.map((item) => (
            <tr key={item.lineNumber}>
              <td className="px-3 py-2 text-foreground-subtle">{item.lineNumber}</td>
              <td className="px-3 py-2 text-foreground">{item.description ?? "—"}</td>
              <td className="px-3 py-2 text-foreground-muted">
                {item.usageAmount ?? "—"}
              </td>
              <td className="px-3 py-2 text-foreground-muted">{item.usageUsd ?? "—"}</td>
              <td className="px-3 py-2 text-foreground-muted">{item.amount ?? "—"}</td>
              <td className="px-3 py-2 text-foreground-muted">
                {item.exchangeRate ?? "—"}
              </td>
              <td className="px-3 py-2 text-foreground-muted">{item.usageUnit ?? "—"}</td>
              <td className="px-3 py-2 text-foreground-muted">
                {item.reconciliationBasis ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
