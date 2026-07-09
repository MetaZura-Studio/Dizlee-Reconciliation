import { InvoiceBankDetailsForm } from "@/components/admin/invoice-bank-details-form";
import {
  getInvoiceBankDetailsView,
  InvoiceBankDetailsError,
  type InvoiceBankDetailsView,
} from "@/lib/admin/invoice-bank-details";

export default async function AdminInvoiceBankDetailsPage() {
  let settings: InvoiceBankDetailsView | null = null;
  let errorMessage: string | null = null;

  try {
    settings = await getInvoiceBankDetailsView();
  } catch (error) {
    errorMessage =
      error instanceof InvoiceBankDetailsError
        ? error.message
        : "Application settings could not be loaded.";
  }

  if (errorMessage) {
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Invoice bank details
        </h1>
        <p className="rounded-md border border-danger-border bg-danger-muted px-3 py-2 text-sm text-danger">
          {errorMessage}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Invoice bank details
        </h1>
        <p className="text-sm text-foreground-muted">
          Default bank account details for Dizlee → OpCo digital invoices.
        </p>
      </div>

      <InvoiceBankDetailsForm initialSettings={settings!} />
    </div>
  );
}
