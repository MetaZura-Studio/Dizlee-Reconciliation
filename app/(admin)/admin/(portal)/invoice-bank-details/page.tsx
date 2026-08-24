import { InvoiceBankDetailsForm } from "@/components/admin/invoice-bank-details-form";
import { PageCard, PageHeader, FormLayout } from "@/components/ui/page";
import {
  getInvoiceBankDetailsView,
  InvoiceBankDetailsError,
  type InvoiceBankDetailsListView,
} from "@/lib/admin/invoice-bank-details";
import { ui } from "@/lib/ui/classes";

export default async function AdminInvoiceBankDetailsPage() {
  let settings: InvoiceBankDetailsListView | null = null;
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
      <PageCard>
        <FormLayout>
          <PageHeader title="Invoice bank details" />
          <p className={ui.alertError}>{errorMessage}</p>
        </FormLayout>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <FormLayout>
        <PageHeader
          title="Invoice bank details"
          description="Bank and signatory details used on digital Dizlee invoices."
        />
        <InvoiceBankDetailsForm initialSettings={settings!} />
      </FormLayout>
    </PageCard>
  );
}
