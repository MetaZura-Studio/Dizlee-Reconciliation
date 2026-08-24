import { ReconciliationToleranceForm } from "@/components/admin/reconciliation-tolerance-form";
import { PageCard, PageHeader, FormLayout, HelpPanel } from "@/components/ui/page";
import {
  getReconciliationTolerance,
  ReconciliationToleranceError,
  type ReconciliationToleranceView,
} from "@/lib/admin/reconciliation-tolerance";
import { ui } from "@/lib/ui/classes";

export default async function AdminReconciliationTolerancePage() {
  let settings: ReconciliationToleranceView | null = null;
  let errorMessage: string | null = null;

  try {
    settings = await getReconciliationTolerance();
  } catch (error) {
    errorMessage =
      error instanceof ReconciliationToleranceError
        ? error.message
        : "Application settings could not be loaded.";
  }

  if (errorMessage) {
    return (
      <PageCard>
        <FormLayout>
          <PageHeader title="Reconciliation tolerance" />
          <p className={ui.alertError}>{errorMessage}</p>
        </FormLayout>
      </PageCard>
    );
  }

  return (
    <PageCard>
      <FormLayout>
        <PageHeader
          title="Reconciliation tolerance"
          description="Set the negligible difference threshold for OpCo vs Partner report comparison."
        />
        <HelpPanel title="How it is used">
          <p>
            Lines within this percentage relative difference are treated as
            matched when Dizlee runs reconciliation.
          </p>
        </HelpPanel>
        <ReconciliationToleranceForm initialSettings={settings!} />
      </FormLayout>
    </PageCard>
  );
}
