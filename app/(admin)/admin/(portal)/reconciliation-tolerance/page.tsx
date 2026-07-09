import { ReconciliationToleranceForm } from "@/components/admin/reconciliation-tolerance-form";
import {
  getReconciliationTolerance,
  ReconciliationToleranceError,
  type ReconciliationToleranceView,
} from "@/lib/admin/reconciliation-tolerance";

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
      <div className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reconciliation tolerance
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
          Reconciliation tolerance
        </h1>
        <p className="text-sm text-foreground-muted">
          Set the negligible difference threshold for OpCo vs Partner report
          comparison.
        </p>
      </div>

      <p className="rounded-md border border-warning-border bg-warning-muted px-3 py-2 text-sm text-warning">
        Lines within this percentage relative difference are treated as matched
        when Dizlee runs reconciliation.
      </p>

      <ReconciliationToleranceForm initialSettings={settings!} />
    </div>
  );
}
